import prisma from '../../config/prisma.js'

export const cartRepository = {
  findCart: ({ userId, sessionId }) =>
    prisma.cart.findFirst({
      where: userId ? { userId } : { sessionId },
      include: {
        items: { include: { product: { include: { images: true, inventory: { select: { currentStock: true, reservedStock: true } } } }, variant: true } },
      },
    }),

  createCart: (data) => prisma.cart.create({ data }),

  async upsertItem(cartId, productId, variantId, quantity) {
    const existing = await prisma.cartItem.findFirst({
      where: { cartId, productId, variantId: variantId || null },
    })
    if (existing) {
      return prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + quantity },
      })
    }
    return prisma.cartItem.create({ data: { cartId, productId, variantId, quantity } })
  },

  updateItem: (id, quantity) => prisma.cartItem.update({ where: { id }, data: { quantity } }),
  removeItem: (id) => prisma.cartItem.delete({ where: { id } }),
  clearItems: (cartId) => prisma.cartItem.deleteMany({ where: { cartId } }),
}
