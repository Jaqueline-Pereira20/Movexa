import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { prisma } from '../prisma.js';
import { HttpError } from '../httpError.js';

export function signToken(user) {
  return jwt.sign({ sub: user.id }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
}

export async function requireAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    throw new HttpError(401, 'Token de autenticação ausente.');
  }

  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch {
    throw new HttpError(401, 'Token inválido ou expirado.');
  }

  // Busca o usuário no banco para refletir mudanças de papel (ex.: promoção a ADMIN)
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: {
      id: true,
      name: true,
      email: true,
      course: true,
      university: true,
      role: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw new HttpError(401, 'Usuário não encontrado.');
  }

  req.user = user;
  next();
}

export function requireAdmin(req, _res, next) {
  if (req.user?.role !== 'ADMIN') {
    throw new HttpError(403, 'Acesso restrito a administradores.');
  }
  next();
}
