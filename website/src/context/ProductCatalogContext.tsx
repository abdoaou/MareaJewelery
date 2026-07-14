import { createContext, useContext, useState, type ReactNode } from 'react'
import { api } from '../services/api'

type ApiProduct = { id: string; slug: string }

interface ProductCatalogContextValue {
  getApiId: (slug: string) => string | undefined
  resolveApiId: (slug: string) => Promise<string | undefined>
}

const ProductCatalogContext = createContext<ProductCatalogContextValue | null>(null)

export function ProductCatalogProvider({ children }: { children: ReactNode }) {
  const [idsBySlug, setIdsBySlug] = useState<Record<string, string>>({})

  const getApiId = (slug: string) => idsBySlug[slug]

  const resolveApiId = async (slug: string) => {
    const cached = idsBySlug[slug]
    if (cached) return cached
    try {
      const res = await api.getProductBySlug(slug)
      const id = (res.data as ApiProduct).id
      setIdsBySlug((prev) => ({ ...prev, [slug]: id }))
      return id
    } catch {
      return undefined
    }
  }

  return (
    <ProductCatalogContext.Provider value={{ getApiId, resolveApiId }}>
      {children}
    </ProductCatalogContext.Provider>
  )
}

export function useProductCatalog() {
  const ctx = useContext(ProductCatalogContext)
  if (!ctx) throw new Error('useProductCatalog must be used within ProductCatalogProvider')
  return ctx
}
