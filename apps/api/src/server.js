require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const prisma = require('./db');
const authRoutes = require('./routes/auth');
const listingRoutes = require('./routes/listings');
const negotiationRoutes = require('./routes/negotiations');
const favoriteRoutes = require('./routes/favorites');
const { uploadDir } = require('./upload');

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error('JWT_SECRET precisa ter pelo menos 32 caracteres.');
const app = express();
app.disable('x-powered-by');
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',').map((origin) => origin.trim()), credentials: false }));
app.use(express.json({ limit: '1mb' }));
app.use('/uploads', express.static(uploadDir, { maxAge: '7d' }));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 50, standardHeaders: true, legacyHeaders: false }));
app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'movexa-api' }));
app.use('/api/auth', authRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/negotiations', negotiationRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use((req, res) => res.status(404).json({ error: 'Rota não encontrada.' }));
app.use((error, _req, res, _next) => {
  if (error.name === 'MulterError' && error.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'A imagem deve ter no máximo 5 MB.' });
  }
  if (error.name === 'MulterError') {
    return res.status(400).json({ error: 'Não foi possível receber a imagem.' });
  }
  if (error.message === 'Formato inválido. Envie PNG, JPG ou WEBP.') {
    return res.status(400).json({ error: error.message });
  }
  if (error.name === 'ZodError') return res.status(400).json({ error: 'Verifique os dados informados.', details: error.issues.map(({ path, message }) => ({ field: path.join('.'), message })) });
  if (error.code === 'P2025') return res.status(404).json({ error: 'Registro não encontrado.' });
  console.error(error);
  return res.status(500).json({ error: 'Erro interno. Tente novamente.' });
});
const port = Number(process.env.PORT || 4000);
const server = app.listen(port, () => console.log(`Movexa API disponível na porta ${port}`));
async function shutdown() { server.close(async () => { await prisma.$disconnect(); process.exit(0); }); }
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);



