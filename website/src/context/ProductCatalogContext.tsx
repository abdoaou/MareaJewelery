import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { api } from '../services/api'

type ApiProduct = { id: string; slug: string }

interface ProductCatalogContextValue {
  getApiId: (slug: string) => string | undefined
  resolveApiId: (slug: string) => Promise<string | undefined>
}

const ProductCatalogContext = createContext<ProductCatalogContextValue | null>(null)

export function ProductCatalogProvider({ children }: { children: ReactNode }) {
  const [idsBySlug, setIdsBySlug] = useState<Record<string, string>>({})
  const idsRef = useRef(idsBySlug)
  idsRef.current = idsBySlug

  const getApiId = useCallback((slug: string) => idsRef.current[slug], [])

  const resolveApiId = useCallback(async (slug: string) => {
    const cached = idsRef.current[slug]
    if (cached) return cached
    try {
      const res = await api.getProductBySlug(slug)
      const id = (res.data as ApiProduct).id
      setIdsBySlug((prev) => ({ ...prev, [slug]: id }))
      return id
    } catch {
      return undefined
    }
  }, [])

  const value = useMemo(
    () => ({ getApiId, resolveApiId }),
    [getApiId, resolveApiId],
  )

  return (
    <ProductCatalogContext.Provider value={value}>{children}</ProductCatalogContext.Provider>
  )
}

export function useProductCatalog() {
  const ctx = useContext(ProductCatalogContext)
  if (!ctx) throw new Error('useProductCatalog must be used within ProductCatalogProvider')
  return ctx
}
