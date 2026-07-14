export interface Product {
  id: string
  apiSlug: string
  apiProductId?: string
  /** When set (API products), used instead of i18n lookup */
  name?: string
  description?: string
  price: number
  originalPrice?: number
  rating: number
  badgeKey?: string
  image: string
  categoryKey: string
  stock: number
}

export interface CollectionItem {
  id: string
  image: string
}

export const collections: CollectionItem[] = [
  { id: 'necklaces', image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&q=80' },
  { id: 'bracelets', image: 'https://images.unsplash.com/photo-1611591437281-460bfbead0db?w=800&q=80' },
  { id: 'rings', image: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&q=80' },
  { id: 'earrings', image: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800&q=80' },
  { id: 'giftSets', image: 'https://images.unsplash.com/photo-1515562141201-7a88fb7ce338?w=800&q=80' },
]

export const bestSellers: Product[] = [
  {
    id: 'aurora-ring',
    apiSlug: 'aurora-diamond-ring',
    price: 189,
    originalPrice: 240,
    rating: 4.9,
    badgeKey: 'badges.bestSeller',
    image: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=600&q=80',
    categoryKey: 'categories.rings',
    stock: 24,
  },
  {
    id: 'luna-bracelet',
    apiSlug: 'luna-pearl-bracelet',
    price: 128,
    originalPrice: 160,
    rating: 4.9,
    badgeKey: 'badges.limited',
    image: 'https://images.unsplash.com/photo-1611591437281-460bfbead0db?w=600&q=80',
    categoryKey: 'categories.bracelets',
    stock: 12,
  },
  {
    id: 'noor-gift-set',
    apiSlug: 'noor-gift-set',
    price: 265,
    originalPrice: 330,
    rating: 5.0,
    badgeKey: 'badges.giftSet',
    image: 'https://images.unsplash.com/photo-1515562141201-7a88fb7ce338?w=600&q=80',
    categoryKey: 'categories.giftSets',
    stock: 18,
  },
]

export const newArrivals: Product[] = [
  {
    id: 'sera-necklace',
    apiSlug: 'sera-gold-necklace',
    price: 145,
    originalPrice: 180,
    rating: 4.8,
    badgeKey: 'badges.new',
    image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600&q=80',
    categoryKey: 'categories.necklaces',
    stock: 30,
  },
  {
    id: 'mira-earrings',
    apiSlug: 'mira-pave-earrings',
    price: 98,
    originalPrice: 125,
    rating: 4.7,
    badgeKey: 'badges.giftPick',
    image: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=600&q=80',
    categoryKey: 'categories.earrings',
    stock: 40,
  },
  {
    id: 'celine-band',
    apiSlug: 'celine-stacking-band',
    price: 76,
    originalPrice: 95,
    rating: 4.8,
    badgeKey: 'badges.new',
    image: 'https://images.unsplash.com/photo-1602751584552-8ba73aad10e6?w=600&q=80',
    categoryKey: 'categories.rings',
    stock: 35,
  },
]

export const testimonialKeys = ['0', '1', '2'] as const
export const faqKeys = ['0', '1', '2'] as const
export const whyChooseKeys = ['0', '1', '2'] as const

export const categoryItems = [
  { id: 'necklaces', image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600&q=80' },
  { id: 'bracelets', image: 'https://images.unsplash.com/photo-1611591437281-460bfbead0db?w=600&q=80' },
  { id: 'rings', image: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=600&q=80' },
  { id: 'earrings', image: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=600&q=80' },
]
