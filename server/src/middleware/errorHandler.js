import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { HttpError } from '../httpError.js';
import { config } from '../config.js';

export function notFound(_req, _res, next) {
  next(new HttpError(404, 'Rota não encontrada.'));
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Dados inválidos.',
      details: err.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    });
  }

  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, details: err.details });
  }

  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'JSON inválido no corpo da requisição.' });
  }

  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Corpo da requisição grande demais.' });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Registro já existe.' });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Registro não encontrado.' });
    }
  }

  console.error(err);
  return res.status(500).json({
    error: 'Erro interno do servidor.',
    ...(config.nodeEnv !== 'production' && { detail: err?.message }),
  });
}
