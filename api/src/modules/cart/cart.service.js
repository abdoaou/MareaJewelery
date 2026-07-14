import { cartRepository } from './cart.repository.js'
import { NotFoundError, ValidationError } from '../../shared/errors/AppError.js'
import prisma from '../../config/prisma.js'

async function getOrCreateCart({ userId, sessionId }) {
  let cart = await cartRepository.findCart({ userId, sessionId })
  if (!cart) {
    cart = await cartRepository.createCart({
      userId,
      sessionId,
      expiresAt: sessionId ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : null,
    })
    cart = await cartRepository.findCart({ userId, sessionId })
  }
  return cart
}

export const cartService = {
  get: ({ userId, sessionId }) => getOrCreateCart({ userId, sessionId }),

  addItem: async ({ userId, sessionId }, { productId, variantId, quantity = 1 }) => {
    const product = await prisma.product.findFirst({ where: { id: productId, deletedAt: null } })
    if (!product) throw new NotFoundError('Product')

    const cart = await getOrCreateCart({ userId, sessionId })
    await cartRepository.upsertItem(cart.id, productId, variantId || null, quantity)
    return cartRepository.findCart({ userId, sessionId })
  },

  updateItem: async ({ userId, sessionId }, itemId, quantity) => {
    const cart = await getOrCreateCart({ userId, sessionId })
    const item = cart.items.find((i) => i.id === itemId)
    if (!item) throw new NotFoundError('Cart item')
    if (quantity <= 0) await cartRepository.removeItem(itemId)
    else await cartRepository.updateItem(itemId, quantity)
    return cartRepository.findCart({ userId, sessionId })
  },

  removeItem: async ({ userId, sessionId }, itemId) => {
    await getOrCreateCart({ userId, sessionId })
    await cartRepository.removeItem(itemId)
    return cartRepository.findCart({ userId, sessionId })
  },

  mergeGuestCart: async (sessionId, userId) => {
    const guestCart = await cartRepository.findCart({ sessionId })
    if (!guestCart) return
    const userCart = await getOrCreateCart({ userId })
    for (const item of guestCart.items) {
      await cartRepository.upsertItem(userCart.id, item.productId, item.variantId, item.quantity)
    }
    await cartRepository.clearItems(guestCart.id)
  },
}
