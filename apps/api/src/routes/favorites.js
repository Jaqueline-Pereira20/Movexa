
const express = require('express');
const prisma = require('../db');
const { requireAuth } = require('../auth');

const router = express.Router();

// Lista os favoritos do estudante autenticado
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const favorites = await prisma.favorite.findMany({
      where: { userId: req.user.sub },
      include: {
        listing: {
          include: {
            owner: {
              select: {
                id: true,
                name: true,
                course: true,
                institution: true,
                location: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      items: favorites.map((favorite) => ({
        ...favorite.listing,
        favoritedAt: favorite.createdAt
      }))
    });
  } catch (error) {
    next(error);
  }
});

// Adiciona um anúncio aos favoritos
router.post('/:listingId', requireAuth, async (req, res, next) => {
  try {
    const { listingId } = req.params;

    const listing = await prisma.listing.findFirst({
      where: {
        id: listingId,
        status: 'ACTIVE'
      },
      select: { id: true }
    });

    if (!listing) {
      return res.status(404).json({
        error: 'Anúncio não encontrado ou indisponível.'
      });
    }

    const favorite = await prisma.favorite.upsert({
      where: {
        userId_listingId: {
          userId: req.user.sub,
          listingId
        }
      },
      create: {
        userId: req.user.sub,
        listingId
      },
      update: {}
    });

    res.status(200).json({
      message: 'Anúncio adicionado aos favoritos.',
      favorite
    });
  } catch (error) {
    next(error);
  }
});

// Remove um anúncio dos favoritos
router.delete('/:listingId', requireAuth, async (req, res, next) => {
  try {
    const { listingId } = req.params;

    await prisma.favorite.deleteMany({
      where: {
        userId: req.user.sub,
        listingId
      }
    });

    res.json({
      message: 'Anúncio removido dos favoritos.'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
