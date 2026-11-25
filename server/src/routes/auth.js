import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { HttpError } from '../httpError.js';
import { requireAuth, signToken } from '../middleware/auth.js';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Muitas tentativas. Tente novamente em alguns minutos.' },
});

const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email().max(254),
  // bcrypt considera apenas os primeiros 72 bytes
  password: z.string().min(8).max(72),
  course: z.string().trim().max(100).optional(),
  university: z.string().trim().max(100).optional(),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(72),
});

const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  course: true,
  university: true,
  role: true,
  createdAt: true,
};

// Hash falso usado para manter o tempo de resposta parecido quando o e-mail não existe
const DUMMY_HASH = bcrypt.hashSync('movexa-dummy-password', 12);

router.post('/register', authLimiter, async (req, res) => {
  const data = registerSchema.parse(req.body);

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    throw new HttpError(409, 'Este e-mail já está cadastrado.');
  }

  const passwordHash = await bcrypt.hash(data.password, 12);

  // O papel nunca vem do cliente: todo cadastro público é STUDENT
  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash,
      course: data.course,
      university: data.university,
    },
    select: publicUserSelect,
  });

  res.status(201).json({ token: signToken(user), user });
});

router.post('/login', authLimiter, async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);

  const user = await prisma.user.findUnique({ where: { email } });
  const valid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);

  if (!user || !valid) {
    throw new HttpError(401, 'E-mail ou senha incorretos.');
  }

  const { passwordHash: _omit, ...publicUser } = user;
  res.json({ token: signToken(user), user: publicUser });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

export default router;
