const express = require('express');
const { z } = require('zod');
const prisma = require('../db');
const { requireAuth } = require('../auth');

const router = express.Router();
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { listingId, content } = z.object({ listingId: z.string(), content: z.string().trim().min(1).max(2000) }).parse(req.body);
    const listing = await prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing || listing.status !== 'ACTIVE') return res.status(404).json({ error: 'Anúncio não encontrado.' });
    if (listing.ownerId === req.user.sub) return res.status(400).json({ error: 'Você não pode iniciar uma negociação no próprio anúncio.' });
    const negotiation = await prisma.negotiation.create({
      data: { listingId, buyerId: req.user.sub, sellerId: listing.ownerId, messages: { create: { content, senderId: req.user.sub } } },
      include: { messages: true, listing: { select: { id: true, title: true, dealType: true } } }
    });
    res.status(201).json({ negotiation });
  } catch (error) { next(error); }
});

router.get('/mine', requireAuth, async (req, res, next) => {
  try {
    const items = await prisma.negotiation.findMany({
      where: { OR: [{ buyerId: req.user.sub }, { sellerId: req.user.sub }] },
      include: { listing: { select: { id: true, title: true, imageUrl: true, dealType: true } }, buyer: { select: { id: true, name: true } }, seller: { select: { id: true, name: true } }, messages: { orderBy: { createdAt: 'asc' } } },
      orderBy: { updatedAt: 'desc' }
    });
    res.json({ items });
  } catch (error) { next(error); }
});

router.post('/:id/messages', requireAuth, async (req, res, next) => {
  try {
    const { content } = z.object({ content: z.string().trim().min(1).max(2000) }).parse(req.body);
    const deal = await prisma.negotiation.findUnique({ where: { id: req.params.id } });
    if (!deal) return res.status(404).json({ error: 'Negociação não encontrada.' });
    if (![deal.buyerId, deal.sellerId].includes(req.user.sub)) return res.status(403).json({ error: 'Esta conversa não pertence à sua conta.' });
    if (deal.status === 'CANCELLED' || deal.status === 'COMPLETED') return res.status(400).json({ error: 'Esta negociação foi encerrada.' });
    const message = await prisma.message.create({ data: { content, negotiationId: deal.id, senderId: req.user.sub } });
    await prisma.negotiation.update({ where: { id: deal.id }, data: { updatedAt: new Date() } });
    res.status(201).json({ message });
  } catch (error) { next(error); }
});

module.exports = router;
