import { useEffect, useRef, useState } from 'react'
import { Plus, Pencil, Trash2, ImagePlus, X } from 'lucide-react'
import { categoriesApi, productsApi } from '../services/api'
import type { Category } from '../types'
import { Modal } from '../components/ui/Modal'
import { EmptyState, Skeleton } from '../components/ui/EmptyState'

const empty = {
  name: '',
  slug: '',
  description: '',
  parentId: '',
  sortOrder: 0,
  isFeatured: false,
  isHidden: false,
  image: '',
}

export function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(empty)
  const [editId, setEditId] = useState<string | null>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function load() {
    setLoading(true)
    categoriesApi
      .list()
      .then((r) => setCategories(r.data || []))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith('blob:')) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  function resetImageState() {
    if (previewUrl?.startsWith('blob:')) URL.revokeObjectURL(previewUrl)
    setPendingFile(null)
    setPreviewUrl(null)
  }

  function openCreate() {
    resetImageState()
    setForm(empty)
    setEditId(null)
    setError('')
    setModal(true)
  }

  function openEdit(c: Category) {
    resetImageState()
    setForm({
      name: c.name,
      slug: c.slug,
      description: c.description || '',
      parentId: c.parentId || '',
      sortOrder: c.sortOrder,
      isFeatured: c.isFeatured,
      isHidden: c.isHidden,
      image: c.image || '',
    })
    setPreviewUrl(c.image || null)
    setEditId(c.id)
    setError('')
    setModal(true)
  }

  function onPickFile(fileList: FileList | null) {
    const file = fileList?.[0]
    if (!file) return
    if (previewUrl?.startsWith('blob:')) URL.revokeObjectURL(previewUrl)
    setPendingFile(file)
    setPreviewUrl(URL.createObjectURL(file))
  }

  function clearImage() {
    if (previewUrl?.startsWith('blob:')) URL.revokeObjectURL(previewUrl)
    setPendingFile(null)
    setPreviewUrl(null)
    setForm((f) => ({ ...f, image: '' }))
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function save() {
    if (!form.name.trim()) {
      setError('Name is required')
      return
    }
    if (!pendingFile && !form.image) {
      setError('Add a category photo')
      return
    }

    setSaving(true)
    setError('')
    try {
      let imageUrl = form.image
      if (pendingFile) {
        const uploaded = await productsApi.upload([pendingFile])
        imageUrl = uploaded[0]?.url || ''
        if (!imageUrl) throw new Error('Image upload failed')
      }

      const payload = {
        name: form.name.trim(),
        description: form.description || undefined,
        parentId: form.parentId || undefined,
        slug: form.slug || form.name.toLowerCase().replace(/\s+/g, '-'),
        sortOrder: form.sortOrder,
        isFeatured: form.isFeatured,
        isHidden: form.isHidden,
        image: imageUrl || undefined,
      }

      if (editId) await categoriesApi.update(editId, payload)
      else await categoriesApi.create(payload)

      setModal(false)
      resetImageState()
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save category')
    } finally {
      setSaving(false)
    }
  }

  async function remove(id: string) {
    if (!confirm('Delete this category?')) return
    await categoriesApi.remove(id)
    load()
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Categories</h1>
          <p className="text-sm text-muted">{categories.length} categories</p>
        </div>
        <button
          type="button"
          className="btn-primary flex items-center justify-center gap-2 sm:w-auto"
          onClick={openCreate}
        >
          <Plus size={16} /> Add Category
        </button>
      </div>

      <div className="card overflow-hidden p-0">
        {loading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : categories.length === 0 ? (
          <EmptyState title="No categories" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead className="border-b border-[var(--color-border)] bg-white/[0.02]">
                <tr>
                  <th className="table-th">Photo</th>
                  <th className="table-th">Name</th>
                  <th className="table-th">Slug</th>
                  <th className="table-th">Parent</th>
                  <th className="table-th">Products</th>
                  <th className="table-th">Order</th>
                  <th className="table-th">Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((c) => (
                  <tr key={c.id} className="border-b border-[var(--color-border)] hover:bg-white/[0.02]">
                    <td className="table-td">
                      {c.image ? (
                        <img
                          src={c.image}
                          alt={c.name}
                          className="h-12 w-12 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/5 text-white/30">
                          <ImagePlus size={16} />
                        </div>
                      )}
                    </td>
                    <td className="table-td font-medium">{c.name}</td>
                    <td className="table-td font-mono text-xs text-white/50">{c.slug}</td>
                    <td className="table-td">{c.parent?.name || '—'}</td>
                    <td className="table-td">{c._count?.products ?? 0}</td>
                    <td className="table-td">{c.sortOrder}</td>
                    <td className="table-td">
                      <div className="flex gap-1">
                        <button type="button" className="btn-ghost p-1" onClick={() => openEdit(c)}>
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          className="btn-ghost p-1 text-red-400"
                          onClick={() => remove(c.id)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={modal} onClose={() => !saving && setModal(false)} title={editId ? 'Edit Category' : 'New Category'}>
        <div className="space-y-4">
          {error && <p className="text-sm text-red-400">{error}</p>}

          <div>
            <label className="mb-1 block text-xs text-white/50">Category photo</label>
            {previewUrl ? (
              <div className="relative inline-block">
                <img
                  src={previewUrl}
                  alt="Category preview"
                  className="h-36 w-36 rounded-xl object-cover"
                />
                <button
                  type="button"
                  className="absolute -right-2 -top-2 rounded-full bg-red-500/90 p-1 text-white"
                  onClick={clearImage}
                  aria-label="Remove photo"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="flex h-36 w-36 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--color-border)] text-sm text-white/50 hover:border-gold hover:text-gold"
                onClick={() => fileInputRef.current?.click()}
              >
                <ImagePlus size={22} />
                Upload photo
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(e) => onPickFile(e.target.files)}
            />
            {previewUrl && (
              <button
                type="button"
                className="btn-ghost mt-2 text-xs"
                onClick={() => fileInputRef.current?.click()}
              >
                Change photo
              </button>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs text-white/50">Name</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-white/50">Slug</label>
            <input
              className="input"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-white/50">Parent</label>
            <select
              className="input"
              value={form.parentId}
              onChange={(e) => setForm({ ...form, parentId: e.target.value })}
            >
              <option value="">None (root)</option>
              {categories
                .filter((c) => c.id !== editId)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-white/50">Sort Order</label>
            <input
              className="input"
              type="number"
              value={form.sortOrder}
              onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isFeatured}
              onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })}
            />
            Featured
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isHidden}
              onChange={(e) => setForm({ ...form, isHidden: e.target.checked })}
            />
            Hidden
          </label>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className="btn-ghost" disabled={saving} onClick={() => setModal(false)}>
            Cancel
          </button>
          <button type="button" className="btn-primary" disabled={saving} onClick={save}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
