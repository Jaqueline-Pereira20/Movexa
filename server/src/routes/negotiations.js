import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { HttpError } from '../httpError.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const content = z.string().trim().min(1).max(1000);

const createSchema = z.object({
  listingId: z.string().trim().min(1).max(40),
  message: content.optional(),
});

const messageSchema = z.object({ content });

const negotiationInclude = {
  listing: {
    select: { id: true, title: true, imageUrl: true, dealType: true, ownerId: true, status: true },
  },
  buyer: { select: { id: true, name: true } },
  messages: { orderBy: { createdAt: 'asc' } },
};

// Inicia (ou retoma) uma negociação com o dono de um anúncio aprovado
router.post('/', requireAuth, async (req, res) => {
  const { listingId, message } = createSchema.parse(req.body);

  const listing = await prisma.listing.findFirst({
    where: { id: listingId, status: 'APPROVED' },
    select: { id: true, ownerId: true },
  });
  if (!listing) throw new HttpError(404, 'Anúncio não encontrado.');

  if (listing.ownerId === req.user.id) {
    throw new HttpError(400, 'Você não pode negociar o próprio anúncio.');
  }

  const existing = await prisma.negotiation.findUnique({
    where: { listingId_buyerId: { listingId, buyerId: req.user.id } },
    select: { id: true },
  });

  const negotiationId = await prisma.$transaction(async (tx) => {
    const negotiation =
      existing ??
      (await tx.negotiation.create({
        data: { listingId, buyerId: req.user.id },
        select: { id: true },
      }));

    if (message) {
      await tx.message.create({
        data: { negotiationId: negotiation.id, senderId: req.user.id, content: message },
      });
      await tx.negotiation.update({ where: { id: negotiation.id }, data: { updatedAt: new Date() } });
    }
    return negotiation.id;
  });

  const negotiation = await prisma.negotiation.findUnique({
    where: { id: negotiationId },
    include: negotiationInclude,
  });

  res.status(existing ? 200 : 201).json({ negotiation });
});

// Negociações em que o usuário é comprador ou dono do anúncio
router.get('/mine', requireAuth, async (req, res) => {
  const items = await prisma.negotiation.findMany({
    where: {
      OR: [{ buyerId: req.user.id }, { listing: { ownerId: req.user.id } }],
    },
    orderBy: { updatedAt: 'desc' },
    include: negotiationInclude,
  });
  res.json({ items });
});

router.post('/:id/messages', requireAuth, async (req, res) => {
  const { content: text } = messageSchema.parse(req.body);

  const negotiation = await prisma.negotiation.findUnique({
    where: { id: req.params.id },
    select: { id: true, buyerId: true, listing: { select: { ownerId: true } } },
  });
  if (!negotiation) throw new HttpError(404, 'Negociação não encontrada.');

  const isParticipant =
    negotiation.buyerId === req.user.id || negotiation.listing.ownerId === req.user.id;
  if (!isParticipant) {
    throw new HttpError(403, 'Você não participa desta negociação.');
  }

  const [message] = await prisma.$transaction([
    prisma.message.create({
      data: { negotiationId: negotiation.id, senderId: req.user.id, content: text },
    }),
    prisma.negotiation.update({
      where: { id: negotiation.id },
      data: { updatedAt: new Date() },
    }),
  ]);

  res.status(201).json({ message });
});

export default router;
