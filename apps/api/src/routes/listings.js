const express = require('express');
const { z } = require('zod');
const prisma = require('../db');
const { requireAuth, requireAdmin } = require('../auth');

const router = express.Router();
const dealTypes = ['SALE', 'TRADE', 'DONATION', 'RENTAL'];
const listingSchema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(10).max(3000),
  category: z.string().trim().min(2).max(80),
  imageUrl: z.union([z.string().url(), z.literal('')]).optional(),
  dealType: z.enum(dealTypes),
  price: z.number().nonnegative().max(1000000).nullable().optional(),
  condition: z.enum(['NEW', 'LIKE_NEW', 'GOOD', 'FAIR']).default('GOOD'),
  location: z.string().trim().min(2).max(120)
});
const listingInclude = { owner: { select: { id: true, name: true, course: true, institution: true, location: true } } };

router.get('/', async (req, res, next) => {
  try {
    const query = z.object({
      q: z.string().trim().max(100).optional(),
      category: z.string().trim().max(80).optional(),
      dealType: z.enum(dealTypes).optional(),
      location: z.string().trim().max(120).optional(),
      page: z.coerce.number().int().min(1).default(1)
    }).parse(req.query);
    const where = { status: 'ACTIVE' };
    if (query.q) where.OR = [{ title: { contains: query.q, mode: 'insensitive' } }, { description: { contains: query.q, mode: 'insensitive' } }];
    if (query.category) where.category = { equals: query.category, mode: 'insensitive' };
    if (query.dealType) where.dealType = query.dealType;
    if (query.location) where.location = { contains: query.location, mode: 'insensitive' };
    const [items, total] = await Promise.all([
      prisma.listing.findMany({ where, include: listingInclude, orderBy: { createdAt: 'desc' }, take: 24, skip: (query.page - 1) * 24 }),
      prisma.listing.count({ where })
    ]);
    res.json({ items, page: query.page, total, pages: Math.ceil(total / 24) });
  } catch (error) { next(error); }
});

router.get('/mine', requireAuth, async (req, res, next) => {
  try {
    const items = await prisma.listing.findMany({ where: { ownerId: req.user.sub }, orderBy: { createdAt: 'desc' } });
    res.json({ items });
  } catch (error) { next(error); }
});

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const data = listingSchema.parse(req.body);
    const listing = await prisma.listing.create({ data: { ...data, imageUrl: data.imageUrl || null, ownerId: req.user.sub }, include: listingInclude });
    res.status(201).json({ listing, message: 'Anúncio enviado para aprovação.' });
  } catch (error) { next(error); }
});

router.patch('/:id', requireAuth, async (req, res, next) => {
  try {
    const data = listingSchema.partial().parse(req.body);
    const existing = await prisma.listing.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Anúncio não encontrado.' });
    if (existing.ownerId !== req.user.sub && req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Você não pode editar este anúncio.' });
    const listing = await prisma.listing.update({ where: { id: existing.id }, data: { ...data, ...(data.imageUrl === '' ? { imageUrl: null } : {}) }, include: listingInclude });
    res.json({ listing });
  } catch (error) { next(error); }
});

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const existing = await prisma.listing.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Anúncio não encontrado.' });
    if (existing.ownerId !== req.user.sub && req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Você não pode excluir este anúncio.' });
    await prisma.listing.delete({ where: { id: existing.id } });
    res.status(204).end();
  } catch (error) { next(error); }
});

router.get('/admin/pending', requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    const items = await prisma.listing.findMany({ where: { status: 'PENDING' }, include: listingInclude, orderBy: { createdAt: 'asc' } });
    res.json({ items });
  } catch (error) { next(error); }
});

router.patch('/admin/:id/moderate', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { status } = z.object({ status: z.enum(['ACTIVE', 'REJECTED']) }).parse(req.body);
    const listing = await prisma.listing.update({ where: { id: req.params.id }, data: { status }, include: listingInclude });
    res.json({ listing });
  } catch (error) { next(error); }
});

module.exports = router;
