import { useEffect, useState, useCallback, useRef } from 'react'
import { format } from 'date-fns'
import { Plus, Pencil, Trash2, Copy, Search, Upload, Star, X, ImageIcon } from 'lucide-react'
import { productsApi, categoriesApi } from '../services/api'
import type { Product, Category } from '../types'
import { Badge } from '../components/ui/Badge'
import { Modal } from '../components/ui/Modal'
import { EmptyState, Skeleton } from '../components/ui/EmptyState'

const MAX_IMAGES = 5
const MIN_IMAGES = 1
const PAGE_SIZE = 15

type SortOption =
  | 'newest'
  | 'oldest'
  | 'updated-newest'
  | 'updated-oldest'
  | 'price-asc'
  | 'price-desc'
  | 'stock-asc'

function sortParams(sort: SortOption): { sortBy: string; sortOrder: string } {
  switch (sort) {
    case 'oldest':
      return { sortBy: 'createdAt', sortOrder: 'asc' }
    case 'updated-newest':
      return { sortBy: 'updatedAt', sortOrder: 'desc' }
    case 'updated-oldest':
      return { sortBy: 'updatedAt', sortOrder: 'asc' }
    case 'price-asc':
      return { sortBy: 'price', sortOrder: 'asc' }
    case 'price-desc':
      return { sortBy: 'price', sortOrder: 'desc' }
    case 'stock-asc':
      return { sortBy: 'stock', sortOrder: 'asc' }
    default:
      return { sortBy: 'createdAt', sortOrder: 'desc' }
  }
}

const emptyForm = {
  name: '',
  slug: '',
  sku: '',
  price: '',
  salePrice: '',
  description: '',
  status: 'PUBLISHED',
  categoryId: '',
  tags: '',
  initialStock: '10',
  isBestSeller: false,
  isNewArrival: true,
}

type ExistingImage = { id: string; url: string; isPrimary: boolean }
type PendingImage = { localId: string; file: File; previewUrl: string }

export function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [sort, setSort] = useState<SortOption>('newest')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [modal, setModal] = useState<'create' | 'edit' | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState<string | null>(null)
  const [existingImages, setExistingImages] = useState<ExistingImage[]>([])
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([])
  const [primaryKey, setPrimaryKey] = useState<string | null>(null)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const load = useCallback((silent = false) => {
    if (!silent) setLoading(true)
    const { sortBy, sortOrder } = sortParams(sort)
    const params: Record<string, string> = {
      page: String(page),
      limit: String(PAGE_SIZE),
      sortBy,
      sortOrder,
    }
    if (search) params.search = search
    if (categoryFilter) params.categoryId = categoryFilter
    productsApi
      .list(params)
      .then((r) => {
        setProducts(r.data || [])
        setTotal(r.meta?.total || 0)
      })
      .finally(() => {
        if (!silent) setLoading(false)
      })
  }, [search, categoryFilter, sort, page])

  async function refreshProductInList(productId: string) {
    const res = await productsApi.get(productId)
    if (!res.data) return
    setProducts((prev) => {
      const idx = prev.findIndex((p) => p.id === productId)
      if (idx < 0) return prev
      const next = [...prev]
      next[idx] = res.data
      return next
    })
  }

  useEffect(() => {
    const t = setTimeout(load, 300)
    return () => clearTimeout(t)
  }, [load])

  useEffect(() => {
    categoriesApi.list().then((r) => setCategories(r.data || []))
  }, [])

  useEffect(() => {
    return () => {
      pendingImages.forEach((img) => URL.revokeObjectURL(img.previewUrl))
    }
    // only on unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function clearPending() {
    setPendingImages((prev) => {
      prev.forEach((img) => URL.revokeObjectURL(img.previewUrl))
      return []
    })
  }

  function closeModal() {
    setModal(null)
    setError('')
    clearPending()
    setExistingImages([])
    setPrimaryKey(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function openCreate() {
    setForm(emptyForm)
    setEditId(null)
    setExistingImages([])
    clearPending()
    setPrimaryKey(null)
    setError('')
    setModal('create')
  }

  function stockOf(p: Product) {
    return p.inventory?.reduce((s, i) => s + i.currentStock, 0) ?? 0
  }

  function openEdit(p: Product) {
    setForm({
      name: p.name,
      slug: p.slug,
      sku: p.sku || '',
      price: String(p.price),
      salePrice: p.salePrice ? String(p.salePrice) : '',
      description: p.description || '',
      status: p.status,
      categoryId: p.category?.id || '',
      tags: (p.tags || []).join(', '),
      initialStock: String(stockOf(p)),
      isBestSeller: Boolean(p.isBestSeller),
      isNewArrival: Boolean(p.isNewArrival),
    })
    setEditId(p.id)
    const imgs = (p.images || []).map((img) => ({
      id: img.id,
      url: img.url,
      isPrimary: img.isPrimary,
    }))
    setExistingImages(imgs)
    clearPending()
    const primary = imgs.find((i) => i.isPrimary) || imgs[0]
    setPrimaryKey(primary ? `existing:${primary.id}` : null)
    setError('')
    setModal('edit')
  }

  const totalImages = existingImages.length + pendingImages.length
  const slotsLeft = MAX_IMAGES - totalImages

  function addFiles(fileList: FileList | null) {
    if (!fileList?.length) return
    const files = Array.from(fileList).filter((f) => f.type.startsWith('image/'))
    if (!files.length) {
      setError('Please choose image files (JPG, PNG, WEBP)')
      return
    }
    if (files.length > slotsLeft) {
      setError(`You can add at most ${MAX_IMAGES} images (${slotsLeft} slot${slotsLeft === 1 ? '' : 's'} left)`)
    }
    const toAdd = files.slice(0, Math.max(0, slotsLeft)).map((file) => ({
      localId: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
    }))
    if (!toAdd.length) return

    setPendingImages((prev) => {
      const next = [...prev, ...toAdd]
      if (!primaryKey && existingImages.length === 0 && prev.length === 0) {
        setPrimaryKey(`pending:${toAdd[0].localId}`)
      }
      return next
    })
    setError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function removePending(localId: string) {
    setPendingImages((prev) => {
      const target = prev.find((i) => i.localId === localId)
      if (target) URL.revokeObjectURL(target.previewUrl)
      const next = prev.filter((i) => i.localId !== localId)
      setPrimaryKey((key) => {
        if (key !== `pending:${localId}`) return key
        if (existingImages[0]) return `existing:${existingImages[0].id}`
        if (next[0]) return `pending:${next[0].localId}`
        return null
      })
      return next
    })
  }

  async function removeExisting(imageId: string) {
    if (existingImages.length + pendingImages.length <= MIN_IMAGES) {
      setError('A product must have at least 1 image')
      return
    }
    if (editId) {
      try {
        await productsApi.removeImage(editId, imageId)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not remove image')
        return
      }
    }
    setExistingImages((prev) => prev.filter((i) => i.id !== imageId))
    setPrimaryKey((key) => {
      if (key !== `existing:${imageId}`) return key
      const remaining = existingImages.filter((i) => i.id !== imageId)
      if (remaining[0]) return `existing:${remaining[0].id}`
      if (pendingImages[0]) return `pending:${pendingImages[0].localId}`
      return null
    })
  }

  async function save() {
    setError('')
    const imageCount = existingImages.length + pendingImages.length
    if (modal === 'create' && imageCount < MIN_IMAGES) {
      setError('Add at least 1 product image')
      return
    }
    if (imageCount > MAX_IMAGES) {
      setError(`A product can have at most ${MAX_IMAGES} images`)
      return
    }
    if (!form.name.trim() || !form.price) {
      setError('Name and price are required')
      return
    }

    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        slug: form.slug || undefined,
        sku: form.sku || undefined,
        price: Number(form.price),
        salePrice: form.salePrice ? Number(form.salePrice) : undefined,
        description: form.description,
        status: form.status,
        categoryId: form.categoryId || undefined,
        tags: form.tags ? form.tags.split(',').map((t) => t.trim()) : [],
        isBestSeller: form.isBestSeller,
        isNewArrival: form.isNewArrival,
      }
      if (form.initialStock !== '') {
        payload.initialStock = Number(form.initialStock)
      }

      const uploadPromise = pendingImages.length
        ? productsApi.upload(pendingImages.map((p) => p.file))
        : Promise.resolve(null)

      let productId = editId
      if (modal === 'create') {
        const [createRes, uploaded] = await Promise.all([
          productsApi.create(payload),
          uploadPromise,
        ])
        productId = createRes.data.id
        if (uploaded?.length) {
          await productsApi.addImages(
            productId,
            uploaded.map((u, i) => ({
              url: u.url,
              isPrimary: primaryKey === `pending:${pendingImages[i].localId}`,
              sortOrder: existingImages.length + i,
            })),
          )
        }
      } else if (editId) {
        const [, uploaded] = await Promise.all([productsApi.update(editId, payload), uploadPromise])
        productId = editId
        if (uploaded?.length) {
          await productsApi.addImages(
            productId,
            uploaded.map((u, i) => ({
              url: u.url,
              isPrimary: primaryKey === `pending:${pendingImages[i].localId}`,
              sortOrder: existingImages.length + i,
            })),
          )
        }
      }

      if (productId && primaryKey?.startsWith('existing:') && modal === 'edit') {
        const imageId = primaryKey.replace('existing:', '')
        const currentPrimary = existingImages.find((img) => img.isPrimary)
        if (currentPrimary?.id !== imageId) {
          await productsApi.setPrimaryImage(productId, imageId)
        }
      }

      const savedProductId = productId
      const wasCreate = modal === 'create'
      closeModal()
      setSaving(false)

      if (savedProductId) {
        if (wasCreate) {
          void load(true)
        } else {
          void refreshProductInList(savedProductId)
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save product')
    } finally {
      setSaving(false)
    }
  }

  async function remove(id: string) {
    if (!confirm('Soft delete this product?')) return
    await productsApi.remove(id)
    load()
  }

  async function duplicate(id: string) {
    await productsApi.duplicate(id)
    load()
  }

  function primaryUrl(p: Product) {
    return p.images?.find((i) => i.isPrimary)?.url || p.images?.[0]?.url
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Products</h1>
          <p className="text-sm text-muted">Manage catalog</p>
        </div>
        <div className="toolbar">
          <div className="relative">
            <Search className="absolute top-1/2 left-3 -translate-y-1/2 text-subtle" size={14} />
            <input
              className="input pl-8"
              placeholder="Search…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
            />
          </div>
          <select
            className="input"
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value)
              setPage(1)
            }}
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            className="input"
            value={sort}
            onChange={(e) => {
              setSort(e.target.value as SortOption)
              setPage(1)
            }}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="updated-newest">Updated: newest first</option>
            <option value="updated-oldest">Updated: oldest first</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
            <option value="stock-asc">Stock: low to high</option>
          </select>
          <button type="button" className="btn-primary flex items-center gap-2" onClick={openCreate}>
            <Plus size={16} /> Add Product
          </button>
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        {loading ? (
          <div className="space-y-3 p-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
        ) : products.length === 0 ? (
          <EmptyState
            title="No products"
            description={categoryFilter || search ? 'Try a different filter or search' : 'Create your first product'}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-[var(--color-border)] bg-white/[0.02]">
                <tr>
                  <th className="table-th">Product</th>
                  <th className="table-th">SKU</th>
                  <th className="table-th">Category</th>
                  <th className="table-th">Stock</th>
                  <th className="table-th">Price</th>
                  <th className="table-th">Added</th>
                  <th className="table-th">Views</th>
                  <th className="table-th">Sales</th>
                  <th className="table-th">Status</th>
                  <th className="table-th">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const thumb = primaryUrl(p)
                  const extra = (p.images?.length || 0) - 1
                  return (
                    <tr key={p.id} className="border-b border-[var(--color-border)] hover:bg-white/[0.02]">
                      <td className="table-td">
                        <div className="flex items-center gap-3">
                          {thumb ? (
                            <div className="relative">
                              <img src={thumb} alt="" className="h-10 w-10 rounded-lg object-cover" />
                              {extra > 0 && (
                                <span className="absolute -right-1 -bottom-1 rounded bg-gold px-1 text-[10px] font-bold text-black">
                                  +{extra}
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5 text-xs">—</div>
                          )}
                          <span className="font-medium">{p.name}</span>
                        </div>
                      </td>
                      <td className="table-td font-mono text-xs text-muted">{p.sku || '—'}</td>
                      <td className="table-td">{p.category?.name || '—'}</td>
                      <td className="table-td">{stockOf(p)}</td>
                      <td className="table-td">
                        {p.salePrice ? (
                          <>
                            <span className="text-gold">${Number(p.salePrice).toFixed(2)}</span>
                            <span className="ml-1 text-xs text-subtle line-through">${Number(p.price).toFixed(2)}</span>
                          </>
                        ) : (
                          `$${Number(p.price).toFixed(2)}`
                        )}
                      </td>
                      <td className="table-td text-muted">{format(new Date(p.createdAt), 'MMM d, yyyy')}</td>
                      <td className="table-td">{p.viewCount ?? 0}</td>
                      <td className="table-td">{p._count?.orderItems ?? 0}</td>
                      <td className="table-td"><Badge status={p.status} /></td>
                      <td className="table-td">
                        <div className="flex gap-1">
                          <button type="button" className="btn-ghost p-1" onClick={() => openEdit(p)}><Pencil size={14} /></button>
                          <button type="button" className="btn-ghost p-1" onClick={() => duplicate(p.id)}><Copy size={14} /></button>
                          <button type="button" className="btn-ghost p-1 text-red-400" onClick={() => remove(p.id)}><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {total > PAGE_SIZE && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <button type="button" className="btn-ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </button>
          <span className="px-3 py-2 text-sm text-white/50">
            Page {page} of {Math.ceil(total / PAGE_SIZE)}
          </span>
          <button
            type="button"
            className="btn-ghost"
            disabled={page * PAGE_SIZE >= total}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}

      <Modal open={!!modal} onClose={closeModal} title={modal === 'create' ? 'New Product' : 'Edit Product'} wide>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs text-muted">Name</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted">SKU</label>
            <input className="input" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted">Status</label>
            <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {['PUBLISHED', 'DRAFT', 'HIDDEN', 'ARCHIVED'].map((s) => <option key={s}>{s}</option>)}
            </select>
            <p className="mt-1 text-xs text-subtle">Only PUBLISHED products appear on the website.</p>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted">
              {modal === 'create' ? 'Initial stock' : 'Stock'}
            </label>
            <input
              className="input"
              type="number"
              min={0}
              value={form.initialStock}
              onChange={(e) => setForm({ ...form, initialStock: e.target.value })}
            />
          </div>
          <div className="flex flex-wrap items-center gap-6 sm:col-span-2">
            <label className="flex items-center gap-2 text-sm text-muted">
              <input
                type="checkbox"
                checked={form.isBestSeller}
                onChange={(e) => setForm({ ...form, isBestSeller: e.target.checked })}
              />
              Best seller (home section)
            </label>
            <label className="flex items-center gap-2 text-sm text-muted">
              <input
                type="checkbox"
                checked={form.isNewArrival}
                onChange={(e) => setForm({ ...form, isNewArrival: e.target.checked })}
              />
              New arrival (home section)
            </label>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted">Price</label>
            <input className="input" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted">Sale Price</label>
            <input className="input" type="number" value={form.salePrice} onChange={(e) => setForm({ ...form, salePrice: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs text-muted">Category</label>
            <select className="input" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
              <option value="">None</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs text-muted">Description</label>
            <textarea className="input min-h-20" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs text-muted">Tags (comma separated)</label>
            <input className="input" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
          </div>

          <div className="sm:col-span-2">
            <div className="mb-2 flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs text-muted">
                <Upload size={14} /> Product images ({totalImages}/{MAX_IMAGES})
              </label>
              <span className="text-xs text-subtle">1–5 images · click star for main photo</span>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
              {existingImages.map((img) => {
                const key = `existing:${img.id}`
                const isPrimary = primaryKey === key
                return (
                  <div
                    key={img.id}
                    className={`group relative aspect-square overflow-hidden rounded-xl border ${
                      isPrimary ? 'border-gold ring-2 ring-gold/40' : 'border-[var(--color-border)]'
                    }`}
                  >
                    <img src={img.url} alt="" className="h-full w-full object-cover" />
                    <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/55 p-1.5">
                      <button
                        type="button"
                        title="Set as main image"
                        onClick={() => setPrimaryKey(key)}
                        className={`rounded p-1 ${isPrimary ? 'text-gold' : 'text-white/70 hover:text-gold'}`}
                      >
                        <Star size={14} fill={isPrimary ? 'currentColor' : 'none'} />
                      </button>
                      <button
                        type="button"
                        title="Remove"
                        onClick={() => removeExisting(img.id)}
                        className="rounded p-1 text-white/70 hover:text-red-400"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    {isPrimary && (
                      <span className="absolute top-1.5 left-1.5 rounded bg-gold px-1.5 py-0.5 text-[10px] font-bold text-black">
                        Main
                      </span>
                    )}
                  </div>
                )
              })}

              {pendingImages.map((img) => {
                const key = `pending:${img.localId}`
                const isPrimary = primaryKey === key
                return (
                  <div
                    key={img.localId}
                    className={`group relative aspect-square overflow-hidden rounded-xl border ${
                      isPrimary ? 'border-gold ring-2 ring-gold/40' : 'border-[var(--color-border)]'
                    }`}
                  >
                    <img src={img.previewUrl} alt={img.file.name} className="h-full w-full object-cover" />
                    <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/55 p-1.5">
                      <button
                        type="button"
                        title="Set as main image"
                        onClick={() => setPrimaryKey(key)}
                        className={`rounded p-1 ${isPrimary ? 'text-gold' : 'text-white/70 hover:text-gold'}`}
                      >
                        <Star size={14} fill={isPrimary ? 'currentColor' : 'none'} />
                      </button>
                      <button
                        type="button"
                        title="Remove"
                        onClick={() => removePending(img.localId)}
                        className="rounded p-1 text-white/70 hover:text-red-400"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    {isPrimary && (
                      <span className="absolute top-1.5 left-1.5 rounded bg-gold px-1.5 py-0.5 text-[10px] font-bold text-black">
                        Main
                      </span>
                    )}
                    <span className="absolute top-1.5 right-1.5 max-w-[70%] truncate rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white/80">
                      {img.file.name}
                    </span>
                  </div>
                )
              })}

              {slotsLeft > 0 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex aspect-square flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--color-border)] text-muted transition hover:border-gold/50 hover:text-gold"
                >
                  <ImageIcon size={22} />
                  <span className="text-xs">Add image</span>
                  <span className="text-[10px] text-subtle">{slotsLeft} left</span>
                </button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(e) => addFiles(e.target.files)}
            />
          </div>
        </div>

        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={closeModal} disabled={saving}>Cancel</button>
          <button type="button" className="btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save Product'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
