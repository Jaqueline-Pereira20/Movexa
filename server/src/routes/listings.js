import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { HttpError } from '../httpError.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

const PAGE_SIZE = 12;
const DEAL_TYPES = ['SALE', 'TRADE', 'DONATION', 'RENTAL'];

const ownerSelect = { id: true, name: true, course: true, university: true };

function serialize(listing) {
  return {
    ...listing,
    price: listing.price === null || listing.price === undefined ? null : Number(listing.price),
  };
}

function checkPricing(dealType, price) {
  if ((dealType === 'SALE' || dealType === 'RENTAL') && (price === null || price === undefined)) {
    throw new HttpError(400, 'Informe o preço para anúncios de venda ou aluguel.');
  }
  if ((dealType === 'DONATION' || dealType === 'TRADE') && price) {
    throw new HttpError(400, 'Doações e trocas não devem ter preço.');
  }
}

const imageUrl = z
  .string()
  .trim()
  .url()
  .max(500)
  .refine((value) => /^https?:\/\//i.test(value), 'A imagem deve ser uma URL http(s).');

const listingFields = {
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(10).max(2000),
  category: z.string().trim().min(2).max(50),
  dealType: z.enum(DEAL_TYPES),
  price: z.coerce.number().min(0).max(99999999).nullable().optional(),
  location: z.string().trim().min(2).max(100),
  imageUrl: imageUrl.nullable().optional(),
};

const createSchema = z.object(listingFields);

const updateSchema = z
  .object({
    ...listingFields,
    // O dono só pode encerrar o anúncio; aprovar/rejeitar é papel do admin
    status: z.literal('CLOSED'),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, 'Envie ao menos um campo para atualizar.');

const querySchema = z.object({
  q: z.string().trim().max(100).optional(),
  category: z.string().trim().max(50).optional(),
  dealType: z.enum(DEAL_TYPES).optional(),
  location: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
});

const moderateSchema = z
  .object({
    decision: z.enum(['APPROVED', 'REJECTED']),
    note: z.string().trim().min(3).max(500).optional(),
  })
  .refine((data) => data.decision !== 'REJECTED' || data.note, {
    message: 'Informe o motivo da rejeição.',
    path: ['note'],
  });

async function findListingOr404(id) {
  const listing = await prisma.listing.findUnique({ where: { id } });
  if (!listing) throw new HttpError(404, 'Anúncio não encontrado.');
  return listing;
}

// Catálogo público: somente anúncios aprovados
router.get('/', async (req, res) => {
  const { q, category, dealType, location, page } = querySchema.parse(req.query);

  const where = {
    status: 'APPROVED',
    ...(dealType && { dealType }),
    ...(category && { category: { equals: category, mode: 'insensitive' } }),
    ...(location && { location: { contains: location, mode: 'insensitive' } }),
    ...(q && {
      OR: [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ],
    }),
  };

  const [total, items] = await Promise.all([
    prisma.listing.count({ where }),
    prisma.listing.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { owner: { select: ownerSelect } },
    }),
  ]);

  res.json({
    items: items.map(serialize),
    page,
    pageSize: PAGE_SIZE,
    total,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  });
});

router.get('/mine', requireAuth, async (req, res) => {
  const items = await prisma.listing.findMany({
    where: { ownerId: req.user.id },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ items: items.map(serialize) });
});

router.post('/', requireAuth, async (req, res) => {
  const data = createSchema.parse(req.body);
  checkPricing(data.dealType, data.price);

  const listing = await prisma.listing.create({
    data: {
      ...data,
      price: data.price ?? null,
      imageUrl: data.imageUrl ?? null,
      ownerId: req.user.id,
      status: 'PENDING',
    },
  });

  res.status(201).json({ listing: serialize(listing) });
});

// --- Moderação (rotas /admin devem vir antes de /:id) ---

router.get('/admin/pending', requireAuth, requireAdmin, async (_req, res) => {
  const items = await prisma.listing.findMany({
    where: { status: 'PENDING' },
    orderBy: { createdAt: 'asc' },
    include: { owner: { select: ownerSelect } },
  });
  res.json({ items: items.map(serialize) });
});

router.patch('/admin/:id/moderate', requireAuth, requireAdmin, async (req, res) => {
  const { decision, note } = moderateSchema.parse(req.body);
  const listing = await findListingOr404(req.params.id);

  if (listing.status !== 'PENDING') {
    throw new HttpError(409, 'Apenas anúncios pendentes podem ser moderados.');
  }

  const updated = await prisma.listing.update({
    where: { id: listing.id },
    data: { status: decision, moderationNote: decision === 'REJECTED' ? note : null },
  });

  res.json({ listing: serialize(updated) });
});

// --- Detalhe e gestão por dono ---

router.get('/:id', async (req, res) => {
  const listing = await prisma.listing.findFirst({
    where: { id: req.params.id, status: 'APPROVED' },
    include: { owner: { select: ownerSelect } },
  });
  if (!listing) throw new HttpError(404, 'Anúncio não encontrado.');
  res.json({ listing: serialize(listing) });
});

router.patch('/:id', requireAuth, async (req, res) => {
  const data = updateSchema.parse(req.body);
  const listing = await findListingOr404(req.params.id);

  if (listing.ownerId !== req.user.id) {
    throw new HttpError(403, 'Você não tem permissão para alterar este anúncio.');
  }
  if (listing.status === 'CLOSED') {
    throw new HttpError(409, 'Anúncios encerrados não podem ser alterados.');
  }

  // Encerrar o anúncio (ex.: item já vendido/doado)
  if (data.status === 'CLOSED') {
    const closed = await prisma.listing.update({
      where: { id: listing.id },
      data: { status: 'CLOSED' },
    });
    return res.json({ listing: serialize(closed) });
  }

  const dealType = data.dealType ?? listing.dealType;
  const price = data.price !== undefined ? data.price : listing.price && Number(listing.price);
  checkPricing(dealType, price);

  // Se o tipo passou a não ter preço, zera o valor antigo
  const nextPrice = dealType === 'DONATION' || dealType === 'TRADE' ? null : price;

  const updated = await prisma.listing.update({
    where: { id: listing.id },
    data: {
      ...data,
      price: nextPrice,
      // Qualquer edição de conteúdo volta o anúncio para a fila de moderação
      status: 'PENDING',
      moderationNote: null,
    },
  });

  res.json({ listing: serialize(updated) });
});

router.delete('/:id', requireAuth, async (req, res) => {
  const listing = await findListingOr404(req.params.id);

  if (listing.ownerId !== req.user.id && req.user.role !== 'ADMIN') {
    throw new HttpError(403, 'Você não tem permissão para remover este anúncio.');
  }

  await prisma.listing.delete({ where: { id: listing.id } });
  res.status(204).end();
});

export default router;
