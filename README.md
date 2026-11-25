# Movexa

Marketplace estudantil para compra, venda, troca, doação e aluguel de materiais acadêmicos. O repositório agora contém a base funcional do MVP: interface React responsiva, API Express, autenticação por token e persistência PostgreSQL via Prisma.

## Tecnologias

- React + Vite
- Node.js + Express
- PostgreSQL + Prisma
- JWT e bcrypt
- Docker Compose

## Executar com Docker

1. Copie `.env.example` para `.env` e defina um `JWT_SECRET` aleatório com pelo menos 32 caracteres.
2. Inicie os serviços:

   ```bash
   docker compose up --build
   ```

3. Acesse a interface em http://localhost:5173 e a API em http://localhost:4000/api/health.

O compose local prepara o schema com `prisma db push` para facilitar a avaliação do MVP. Para produção, crie e versione migrações (`prisma migrate dev`) e use `prisma migrate deploy` no deploy; não use `db push` como processo de migração de produção.

## Executar sem Docker

Requisitos: Node.js 22+ e PostgreSQL 16+.

```bash
cp .env.example .env
npm install
npm run db:generate
npm run db:push
npm run dev
```

Ajuste `DATABASE_URL` no `.env` para apontar ao PostgreSQL local. O Vite executa em `http://localhost:5173` e encaminha `/api` para a API na porta 4000.

## API inicial

- `POST /api/auth/register` — cadastro de estudante.
- `POST /api/auth/login` — login.
- `GET /api/auth/me` — sessão atual (Bearer token).
- `GET /api/listings` — anúncios ativos com pesquisa e filtros `q`, `category`, `dealType`, `location` e `page`.
- `GET /api/listings/mine`, `POST /api/listings`, `PATCH /api/listings/:id`, `DELETE /api/listings/:id` — anúncios do usuário.
- `GET /api/listings/admin/pending`, `PATCH /api/listings/admin/:id/moderate` — moderação administrativa.
- `POST /api/negotiations`, `GET /api/negotiations/mine`, `POST /api/negotiations/:id/messages` — negociações e mensagens.
- `GET /api/health` — verificação de saúde.

Novos anúncios entram como `PENDING`; apenas anúncios aprovados aparecem no catálogo. Para promover a primeira conta a administradora, atualize manualmente o campo `role` para `ADMIN` no banco após o cadastro. Não há endpoint público para elevar privilégios.

## Segurança e produção

Senhas são armazenadas com bcrypt; as rotas validam entradas, a API aplica Helmet, limite de requisições na autenticação e autorização por propriedade dos recursos. Configure segredos fortes, HTTPS, origens CORS específicas e backups do banco no ambiente de produção. JWT fica no armazenamento local do navegador nesta base inicial; para um lançamento público, recomendamos migrar para cookies HttpOnly/Secure e adicionar fluxo de confirmação de e-mail/recuperação de senha.

A interface inclui imagens de demonstração e aceita URL de imagem no formulário. Upload seguro para Cloudinary/S3, confirmação de e-mail, recuperação de senha, fluxo de aluguel com devolução/taxas, denúncias, transações financeiras, termos completos e testes automatizados são etapas ainda necessárias antes de considerar a plataforma pronta para produção. Pagamentos reais não estão integrados.
