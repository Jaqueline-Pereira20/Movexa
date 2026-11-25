const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const prisma = require('../db');
const { requireAuth } = require('../auth');

const router = express.Router();
const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  password: z.string().min(10).max(72),
  institution: z.string().trim().min(2).max(120),
  course: z.string().trim().min(2).max(120),
  location: z.string().trim().min(2).max(120)
});
const publicUser = ({ passwordHash, ...user }) => user;
const tokenFor = (user) => jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

router.post('/register', async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);
    const email = data.email.toLowerCase();
    const { password, ...userData } = data;
const passwordHash = await bcrypt.hash(password, 12);

const user = await prisma.user.create({
  data: {
    ...userData,
    email,
    passwordHash
  }
});
    res.status(201).json({ user: publicUser(user), token: tokenFor(user) });
  } catch (error) {
    if (error.code === 'P2002') return res.status(409).json({ error: 'Este e-mail já está cadastrado.' });
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const data = z.object({ email: z.string().email(), password: z.string().min(1) }).parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
    if (!user || !(await bcrypt.compare(data.password, user.passwordHash))) return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
    if (user.isBlocked) return res.status(403).json({ error: 'Esta conta está bloqueada. Entre em contato com o suporte.' });
    res.json({ user: publicUser(user), token: tokenFor(user) });
  } catch (error) { next(error); }
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.sub } });
    if (!user || user.isBlocked) return res.status(401).json({ error: 'Conta indisponível.' });
    res.json({ user: publicUser(user) });
  } catch (error) { next(error); }
});

module.exports = router;
