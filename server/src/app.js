import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import { openapi } from './openapi.js';
import { config } from './config.js';
import { prisma } from './prisma.js';
import authRoutes from './routes/auth.js';
import listingRoutes from './routes/listings.js';
import negotiationRoutes from './routes/negotiations.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

const app = express();

if (config.trustProxy !== null) {
  app.set('trust proxy', config.trustProxy);
}

app.use(helmet());
app.use(cors({ origin: config.corsOrigins }));
app.use(express.json({ limit: '100kb' }));

// Limite geral para toda a API (o login/cadastro têm um limite próprio mais rígido)
app.use(
  '/api',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 600,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Muitas requisições. Tente novamente em instantes.' },
  }),
);

app.get('/api/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok' });
  } catch {
    res.status(503).json({ status: 'database_unavailable' });
  }
});

// Documentação interativa (Swagger UI)
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapi, { customSiteTitle: 'Movexa API' }));
app.get('/api/openapi.json', (_req, res) => res.json(openapi));

app.use('/api/auth', authRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/negotiations', negotiationRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
