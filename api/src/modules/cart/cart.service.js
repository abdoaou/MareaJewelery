import { cartRepository } from './cart.repository.js'
import { NotFoundError, ValidationError } from '../../shared/errors/AppError.js'
import prisma from '../../config/prisma.js'

function availableStock(inventory) {
  if (!inventory?.length) return 0
  return inventory.reduce(
    (sum, row) => sum + Math.max(0, row.currentStock - row.reservedStock),
    0,
  )
}

async function assertInStock(productId, quantity) {
  const product = await prisma.product.findFirst({
    where: { id: productId, deletedAt: null, status: 'PUBLISHED' },
    include: { inventory: { select: { currentStock: true, reservedStock: true } } },
  })
  if (!product) throw new NotFoundError('Product')
  const stock = availableStock(product.inventory)
  if (stock <= 0) throw new ValidationError('This product is sold out')
  if (quantity > stock) throw new ValidationError(`Only ${stock} left in stock`)
  return product
}

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
    const qty = Math.max(1, Number(quantity) || 1)
    const cart = await getOrCreateCart({ userId, sessionId })
    const existing = cart.items.find(
      (i) => i.productId === productId && (i.variantId || null) === (variantId || null),
    )
    const nextQty = (existing?.quantity || 0) + qty
    await assertInStock(productId, nextQty)

    await cartRepository.upsertItem(cart.id, productId, variantId || null, qty)
    return cartRepository.findCart({ userId, sessionId })
  },

  updateItem: async ({ userId, sessionId }, itemId, quantity) => {
    const cart = await getOrCreateCart({ userId, sessionId })
    const item = cart.items.find((i) => i.id === itemId)
    if (!item) throw new NotFoundError('Cart item')
    if (quantity <= 0) await cartRepository.removeItem(itemId)
    else {
      await assertInStock(item.productId, quantity)
      await cartRepository.updateItem(itemId, quantity)
    }
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
