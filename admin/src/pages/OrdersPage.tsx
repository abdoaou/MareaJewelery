import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { format } from 'date-fns'
import { Eye, Search, Plus, Package, Trash2 } from 'lucide-react'
import { ordersApi, productsApi, customersApi } from '../services/api'
import type { Order, Product, User, OrderItem } from '../types'
import { Badge } from '../components/ui/Badge'
import { Modal } from '../components/ui/Modal'
import { EmptyState, Skeleton } from '../components/ui/EmptyState'

const STATUSES = ['', 'PENDING', 'CONFIRMED', 'PROCESSING', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED']

type OrderLine = { productId: string; quantity: number }

const emptyCreateForm = () => ({
  userId: '',
  lineItems: [{ productId: '', quantity: 1 }] as OrderLine[],
  paymentMethod: 'COD',
  city: 'Beirut',
  notes: '',
})

function itemImage(item?: OrderItem) {
  return item?.product?.images?.[0]?.url
}

function orderPhone(order: Order) {
  return order.shippingAddress?.phone || order.user?.phone || '—'
}

export function OrdersPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const orderIdParam = searchParams.get('orderId')
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [customerFilter, setCustomerFilter] = useState('')
  const [selected, setSelected] = useState<Order | null>(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  const [createOpen, setCreateOpen] = useState(false)
  const [customers, setCustomers] = useState<User[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [createForm, setCreateForm] = useState(emptyCreateForm())

  const load = useCallback(() => {
    setLoading(true)
    const params: Record<string, string> = { page: String(page), limit: '15' }
    if (search) params.search = search
    if (status) params.status = status
    if (customerFilter) params.userId = customerFilter
    ordersApi
      .list(params)
      .then((res) => {
        setOrders(res.data || [])
        setTotal(res.meta?.total || 0)
      })
      .finally(() => setLoading(false))
  }, [page, search, status, customerFilter])

  useEffect(() => {
    const t = setTimeout(load, 300)
    return () => clearTimeout(t)
  }, [load])

  useEffect(() => {
    customersApi.list({ limit: '50' }).then((r) => setCustomers(r.data?.items || []))
    productsApi.list({ limit: '50', status: 'PUBLISHED' }).then((r) => setProducts(r.data || []))
  }, [])

  useEffect(() => {
    if (!orderIdParam) return
    ordersApi
      .get(orderIdParam)
      .then((r) => {
        if (r.data) setSelected(r.data)
      })
      .finally(() => {
        setSearchParams(
          (prev) => {
            prev.delete('orderId')
            return prev
          },
          { replace: true },
        )
      })
  }, [orderIdParam, setSearchParams])

  async function updateStatus(id: string, newStatus: string) {
    await ordersApi.updateStatus(id, newStatus)
    load()
    if (selected?.id === id) {
      const res = await ordersApi.get(id)
      setSelected(res.data)
    }
  }

  function updateLine(index: number, patch: Partial<OrderLine>) {
    setCreateForm((f) => ({
      ...f,
      lineItems: f.lineItems.map((line, i) => (i === index ? { ...line, ...patch } : line)),
    }))
  }

  function addLine() {
    setCreateForm((f) => ({
      ...f,
      lineItems: [...f.lineItems, { productId: '', quantity: 1 }],
    }))
  }

  function removeLine(index: number) {
    setCreateForm((f) => ({
      ...f,
      lineItems: f.lineItems.length > 1 ? f.lineItems.filter((_, i) => i !== index) : f.lineItems,
    }))
  }

  async function createOrder() {
    const items = createForm.lineItems.filter((l) => l.productId && l.quantity > 0)
    if (!createForm.userId || items.length === 0) return
    await ordersApi.create({
      userId: createForm.userId,
      items,
      paymentMethod: createForm.paymentMethod,
      shippingAddress: { line1: 'Admin order', city: createForm.city, country: 'Lebanon' },
      customerNotes: createForm.notes || undefined,
      adminNotes: 'Created manually from admin dashboard',
      status: 'CONFIRMED',
    })
    setCreateOpen(false)
    setCreateForm(emptyCreateForm())
    load()
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Orders</h1>
          <p className="text-sm text-muted">{total} total orders</p>
        </div>
        <div className="toolbar">
          <button type="button" className="btn-primary flex items-center gap-2" onClick={() => setCreateOpen(true)}>
            <Plus size={16} /> Create Order
          </button>
          <div className="relative">
            <Search className="absolute top-1/2 left-3 -translate-y-1/2 text-white/30" size={14} />
            <input
              className="input pl-8"
              placeholder="Search orders or email…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            />
          </div>
          <select className="input w-auto" value={customerFilter} onChange={(e) => { setCustomerFilter(e.target.value); setPage(1) }}>
            <option value="">All customers</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.firstName} {c.lastName} ({c.email})</option>
            ))}
          </select>
          <select className="input w-auto" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s || 'All statuses'}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        {loading ? (
          <div className="space-y-3 p-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : orders.length === 0 ? (
          <EmptyState title="No orders found" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-[var(--color-border)] bg-white/[0.02]">
                <tr>
                  <th className="table-th">Items</th>
                  <th className="table-th">Order</th>
                  <th className="table-th">Customer</th>
                  <th className="table-th">Phone</th>
                  <th className="table-th">Total</th>
                  <th className="table-th">Status</th>
                  <th className="table-th">Date</th>
                  <th className="table-th">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => {
                  const thumb = o.items?.[0] ? itemImage(o.items[0]) : null
                  return (
                    <tr key={o.id} className="border-b border-[var(--color-border)] hover:bg-white/[0.02]">
                      <td className="table-td">
                        <div className="flex items-center gap-1">
                          {thumb ? (
                            <img src={thumb} alt="" className="h-10 w-10 rounded-lg object-cover" />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5">
                              <Package size={14} className="text-white/30" />
                            </div>
                          )}
                          {o.items && o.items.length > 1 && (
                            <span className="text-xs text-white/40">+{o.items.length - 1}</span>
                          )}
                        </div>
                      </td>
                      <td className="table-td font-mono text-xs">{o.orderNumber}</td>
                      <td className="table-td">{o.user?.email || 'Guest'}</td>
                      <td className="table-td font-mono text-xs text-white/70">{orderPhone(o)}</td>
                      <td className="table-td">${Number(o.total).toFixed(2)}</td>
                      <td className="table-td"><Badge status={o.status} /></td>
                      <td className="table-td text-white/50">{format(new Date(o.createdAt), 'MMM d, yyyy HH:mm')}</td>
                      <td className="table-td">
                        <button type="button" onClick={() => ordersApi.get(o.id).then((r) => setSelected(r.data))} className="btn-ghost text-gold">
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {total > 15 && (
        <div className="mt-4 flex justify-center gap-2">
          <button type="button" className="btn-ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</button>
          <span className="px-3 py-2 text-sm text-white/50">Page {page}</span>
          <button type="button" className="btn-ghost" disabled={page * 15 >= total} onClick={() => setPage((p) => p + 1)}>Next</button>
        </div>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create Order (Admin)" wide>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs text-muted">Customer</label>
            <select className="input" value={createForm.userId} onChange={(e) => setCreateForm({ ...createForm, userId: e.target.value })}>
              <option value="">Select customer…</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.firstName} {c.lastName} — {c.email}</option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs text-muted">Products</label>
              <button type="button" className="btn-ghost text-xs text-gold" onClick={addLine}>
                <Plus size={14} className="mr-1 inline" /> Add product
              </button>
            </div>
            <div className="space-y-3">
              {createForm.lineItems.map((line, index) => (
                <div key={index} className="flex flex-wrap items-end gap-2 rounded-lg border border-[var(--color-border)] p-3">
                  <div className="min-w-[200px] flex-1">
                    <label className="mb-1 block text-xs text-subtle">Product</label>
                    <select
                      className="input"
                      value={line.productId}
                      onChange={(e) => updateLine(index, { productId: e.target.value })}
                    >
                      <option value="">Select product…</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>{p.name} — ${Number(p.salePrice ?? p.price).toFixed(2)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-24">
                    <label className="mb-1 block text-xs text-subtle">Qty</label>
                    <input
                      className="input"
                      type="number"
                      min={1}
                      value={line.quantity}
                      onChange={(e) => updateLine(index, { quantity: Number(e.target.value) })}
                    />
                  </div>
                  {createForm.lineItems.length > 1 && (
                    <button type="button" className="btn-ghost mb-0.5 text-red-400" onClick={() => removeLine(index)} title="Remove">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted">Payment</label>
            <select className="input" value={createForm.paymentMethod} onChange={(e) => setCreateForm({ ...createForm, paymentMethod: e.target.value })}>
              <option value="COD">Cash on Delivery</option>
              <option value="STRIPE">Stripe</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted">City</label>
            <input className="input" value={createForm.city} onChange={(e) => setCreateForm({ ...createForm, city: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs text-muted">Notes</label>
            <input className="input" value={createForm.notes} onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })} />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={() => setCreateOpen(false)}>Cancel</button>
          <button
            type="button"
            className="btn-primary"
            onClick={createOrder}
            disabled={!createForm.userId || !createForm.lineItems.some((l) => l.productId)}
          >
            Place Order ({createForm.lineItems.filter((l) => l.productId).length} items)
          </button>
        </div>
      </Modal>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={`Order ${selected?.orderNumber}`} wide>
        {selected && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {['CONFIRMED', 'PROCESSING', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'].map((s) => (
                <button key={s} type="button" className="btn-ghost border border-[var(--color-border)] text-xs" onClick={() => updateStatus(selected.id, s)}>
                  {s}
                </button>
              ))}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-white/40">Customer</p>
                <p>{selected.user?.firstName} {selected.user?.lastName} ({selected.user?.email})</p>
              </div>
              <div>
                <p className="text-xs text-white/40">Phone</p>
                <p className="font-mono text-sm">{orderPhone(selected)}</p>
              </div>
              <div>
                <p className="text-xs text-white/40">Payment</p>
                <p>{selected.paymentMethod} — {selected.paymentStatus}</p>
              </div>
              <div>
                <p className="text-xs text-white/40">Shipping</p>
                <p>{selected.shippingAddress?.line1}, {selected.shippingAddress?.city}</p>
              </div>
              <div>
                <p className="text-xs text-white/40">Total</p>
                <p className="text-lg font-medium text-gold">${Number(selected.total).toFixed(2)}</p>
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs text-white/40">Items</p>
              {selected.items?.map((item) => {
                const img = itemImage(item)
                return (
                  <div key={item.id} className="flex items-center gap-3 border-b border-[var(--color-border)] py-3">
                    {img ? (
                      <img src={img} alt={item.productName} className="h-14 w-14 rounded-lg object-cover" />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-white/5">
                        <Package size={20} className="text-white/30" />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-medium">{item.productName}</p>
                      <p className="text-xs text-white/40">SKU: {item.sku || '—'} · Qty: {item.quantity}</p>
                    </div>
                    <p className="font-medium">${Number(item.lineTotal).toFixed(2)}</p>
                  </div>
                )
              })}
            </div>

            {selected.statusHistory && selected.statusHistory.length > 0 && (
              <div>
                <p className="mb-2 text-xs text-white/40">Timeline</p>
                {selected.statusHistory.map((h, i) => (
                  <div key={i} className="flex gap-3 text-sm">
                    <span className="text-white/30">{format(new Date(h.createdAt), 'MMM d HH:mm')}</span>
                    <Badge status={h.status} />
                    {h.note && <span className="text-white/50">{h.note}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
