// Documentação OpenAPI 3.0 da API do Movexa (exibida em /api/docs)

const bearer = [{ bearerAuth: [] }];

const errorResponse = (description) => ({
  description,
  content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
});

const idParam = {
  name: 'id',
  in: 'path',
  required: true,
  schema: { type: 'string' },
};

const dealTypes = ['SALE', 'TRADE', 'DONATION', 'RENTAL'];

export const openapi = {
  openapi: '3.0.3',
  info: {
    title: 'Movexa API',
    version: '0.1.0',
    description:
      'Marketplace estudantil para compra, venda, troca, doação e aluguel de materiais acadêmicos.\n\n' +
      'Para testar rotas protegidas: faça login em `POST /auth/login`, copie o `token` e clique em **Authorize**.',
  },
  servers: [{ url: '/api' }],
  tags: [
    { name: 'Sistema' },
    { name: 'Autenticação' },
    { name: 'Anúncios' },
    { name: 'Moderação (admin)' },
    { name: 'Negociações' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          details: { type: 'array', items: { type: 'object' } },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          course: { type: 'string', nullable: true },
          university: { type: 'string', nullable: true },
          role: { type: 'string', enum: ['STUDENT', 'ADMIN'] },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      AuthResponse: {
        type: 'object',
        properties: {
          token: { type: 'string' },
          user: { $ref: '#/components/schemas/User' },
        },
      },
      Listing: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
          category: { type: 'string' },
          dealType: { type: 'string', enum: dealTypes },
          price: { type: 'number', nullable: true },
          location: { type: 'string' },
          imageUrl: { type: 'string', nullable: true },
          status: { type: 'string', enum: ['PENDING', 'APPROVED', 'REJECTED', 'CLOSED'] },
          moderationNote: { type: 'string', nullable: true },
          ownerId: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      ListingInput: {
        type: 'object',
        required: ['title', 'description', 'category', 'dealType', 'location'],
        properties: {
          title: { type: 'string', minLength: 3, maxLength: 120, example: 'Livro de Cálculo I' },
          description: {
            type: 'string',
            minLength: 10,
            maxLength: 2000,
            example: 'Livro Stewart, 8ª edição, em ótimo estado.',
          },
          category: { type: 'string', example: 'Livros' },
          dealType: { type: 'string', enum: dealTypes, example: 'SALE' },
          price: {
            type: 'number',
            nullable: true,
            example: 60,
            description: 'Obrigatório em SALE/RENTAL; proibido em DONATION/TRADE.',
          },
          location: { type: 'string', example: 'Campus Central' },
          imageUrl: { type: 'string', format: 'uri', nullable: true },
        },
      },
      Message: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          negotiationId: { type: 'string' },
          senderId: { type: 'string' },
          content: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Negotiation: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          listingId: { type: 'string' },
          buyerId: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          listing: { type: 'object' },
          buyer: { type: 'object' },
          messages: { type: 'array', items: { $ref: '#/components/schemas/Message' } },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['Sistema'],
        summary: 'Verifica a saúde da API e do banco',
        responses: {
          200: { description: 'OK' },
          503: { description: 'Banco indisponível' },
        },
      },
    },

    '/auth/register': {
      post: {
        tags: ['Autenticação'],
        summary: 'Cadastro de estudante',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'password'],
                properties: {
                  name: { type: 'string', example: 'Maria Silva' },
                  email: { type: 'string', format: 'email', example: 'maria@teste.com' },
                  password: { type: 'string', minLength: 8, maxLength: 72, example: 'senha12345' },
                  course: { type: 'string', example: 'Engenharia' },
                  university: { type: 'string', example: 'UFC' },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Cadastro realizado',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } },
          },
          400: errorResponse('Dados inválidos'),
          409: errorResponse('E-mail já cadastrado'),
          429: errorResponse('Muitas tentativas'),
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Autenticação'],
        summary: 'Login',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email', example: 'maria@teste.com' },
                  password: { type: 'string', example: 'senha12345' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Login realizado',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } },
          },
          401: errorResponse('E-mail ou senha incorretos'),
          429: errorResponse('Muitas tentativas'),
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Autenticação'],
        summary: 'Sessão atual',
        security: bearer,
        responses: {
          200: {
            description: 'Usuário autenticado',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { user: { $ref: '#/components/schemas/User' } },
                },
              },
            },
          },
          401: errorResponse('Token ausente ou inválido'),
        },
      },
    },

    '/listings': {
      get: {
        tags: ['Anúncios'],
        summary: 'Catálogo público (apenas anúncios aprovados)',
        parameters: [
          { name: 'q', in: 'query', schema: { type: 'string' }, description: 'Busca no título e na descrição' },
          { name: 'category', in: 'query', schema: { type: 'string' } },
          { name: 'dealType', in: 'query', schema: { type: 'string', enum: dealTypes } },
          { name: 'location', in: 'query', schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
        ],
        responses: {
          200: {
            description: 'Lista paginada (12 por página)',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    items: { type: 'array', items: { $ref: '#/components/schemas/Listing' } },
                    page: { type: 'integer' },
                    pageSize: { type: 'integer' },
                    total: { type: 'integer' },
                    totalPages: { type: 'integer' },
                  },
                },
              },
            },
          },
          400: errorResponse('Filtros inválidos'),
        },
      },
      post: {
        tags: ['Anúncios'],
        summary: 'Cria um anúncio (entra como PENDING)',
        security: bearer,
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ListingInput' } } },
        },
        responses: {
          201: { description: 'Anúncio criado' },
          400: errorResponse('Dados inválidos'),
          401: errorResponse('Não autenticado'),
        },
      },
    },
    '/listings/mine': {
      get: {
        tags: ['Anúncios'],
        summary: 'Anúncios do usuário logado (todos os status)',
        security: bearer,
        responses: {
          200: { description: 'Lista de anúncios' },
          401: errorResponse('Não autenticado'),
        },
      },
    },
    '/listings/{id}': {
      get: {
        tags: ['Anúncios'],
        summary: 'Detalhe de um anúncio aprovado',
        parameters: [idParam],
        responses: { 200: { description: 'Anúncio' }, 404: errorResponse('Não encontrado') },
      },
      patch: {
        tags: ['Anúncios'],
        summary: 'Edita ou encerra o próprio anúncio',
        description:
          'Editar o conteúdo devolve o anúncio para `PENDING`. Para encerrar, envie `{ "status": "CLOSED" }`.',
        security: bearer,
        parameters: [idParam],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  description: { type: 'string' },
                  category: { type: 'string' },
                  dealType: { type: 'string', enum: dealTypes },
                  price: { type: 'number', nullable: true },
                  location: { type: 'string' },
                  imageUrl: { type: 'string', nullable: true },
                  status: { type: 'string', enum: ['CLOSED'] },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Anúncio atualizado' },
          401: errorResponse('Não autenticado'),
          403: errorResponse('Não é o dono'),
          404: errorResponse('Não encontrado'),
          409: errorResponse('Anúncio encerrado'),
        },
      },
      delete: {
        tags: ['Anúncios'],
        summary: 'Remove o próprio anúncio (admin pode remover qualquer um)',
        security: bearer,
        parameters: [idParam],
        responses: {
          204: { description: 'Removido' },
          401: errorResponse('Não autenticado'),
          403: errorResponse('Sem permissão'),
          404: errorResponse('Não encontrado'),
        },
      },
    },

    '/listings/admin/pending': {
      get: {
        tags: ['Moderação (admin)'],
        summary: 'Anúncios aguardando moderação',
        security: bearer,
        responses: {
          200: { description: 'Lista de pendentes' },
          401: errorResponse('Não autenticado'),
          403: errorResponse('Apenas administradores'),
        },
      },
    },
    '/listings/admin/{id}/moderate': {
      patch: {
        tags: ['Moderação (admin)'],
        summary: 'Aprova ou rejeita um anúncio pendente',
        security: bearer,
        parameters: [idParam],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['decision'],
                properties: {
                  decision: { type: 'string', enum: ['APPROVED', 'REJECTED'] },
                  note: { type: 'string', description: 'Obrigatória ao rejeitar' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Anúncio moderado' },
          400: errorResponse('Dados inválidos'),
          403: errorResponse('Apenas administradores'),
          404: errorResponse('Não encontrado'),
          409: errorResponse('Anúncio não está pendente'),
        },
      },
    },

    '/negotiations': {
      post: {
        tags: ['Negociações'],
        summary: 'Inicia (ou retoma) uma negociação com o dono de um anúncio',
        security: bearer,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['listingId'],
                properties: {
                  listingId: { type: 'string' },
                  message: { type: 'string', example: 'Ainda está disponível?' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Negociação existente retomada',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Negotiation' } } },
          },
          201: { description: 'Negociação criada' },
          400: errorResponse('Não pode negociar o próprio anúncio'),
          401: errorResponse('Não autenticado'),
          404: errorResponse('Anúncio não encontrado'),
        },
      },
    },
    '/negotiations/mine': {
      get: {
        tags: ['Negociações'],
        summary: 'Negociações do usuário (como comprador ou dono do anúncio)',
        security: bearer,
        responses: {
          200: { description: 'Lista de negociações com mensagens' },
          401: errorResponse('Não autenticado'),
        },
      },
    },
    '/negotiations/{id}/messages': {
      post: {
        tags: ['Negociações'],
        summary: 'Envia mensagem em uma negociação',
        security: bearer,
        parameters: [idParam],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['content'],
                properties: { content: { type: 'string', maxLength: 1000, example: 'Pode ser amanhã?' } },
              },
            },
          },
        },
        responses: {
          201: { description: 'Mensagem enviada' },
          401: errorResponse('Não autenticado'),
          403: errorResponse('Você não participa desta negociação'),
          404: errorResponse('Negociação não encontrada'),
        },
      },
    },
  },
};
