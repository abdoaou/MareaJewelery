import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { inventoryApi } from '../services/api'
import type { InventoryRow } from '../types'
import { Modal } from '../components/ui/Modal'
import { EmptyState, Skeleton } from '../components/ui/EmptyState'

export function InventoryPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const highlightProductId = searchParams.get('productId')
  const [items, setItems] = useState<InventoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [lowOnly, setLowOnly] = useState(false)
  const [adjustRow, setAdjustRow] = useState<InventoryRow | null>(null)
  const [qty, setQty] = useState('')

  function load(silent = false) {
    if (!silent) setLoading(true)
    const params: Record<string, string> = {}
    if (lowOnly) params.lowStock = 'true'
    inventoryApi
      .list(params)
      .then((r) => setItems(r.data?.items || []))
      .finally(() => {
        if (!silent) setLoading(false)
      })
  }

  useEffect(() => { load() }, [lowOnly])

  useEffect(() => {
    if (!highlightProductId || loading || items.length === 0) return
    const el = document.getElementById(`inv-product-${highlightProductId}`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setSearchParams(
      (prev) => {
        prev.delete('productId')
        return prev
      },
      { replace: true },
    )
  }, [highlightProductId, loading, items, setSearchParams])

  async function adjust() {
    if (!adjustRow || !qty) return
    await inventoryApi.adjust(adjustRow.id, Number(qty), 'Manual adjustment from admin')
    setAdjustRow(null)
    setQty('')
    void load(true)
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Inventory</h1>
          <p className="text-sm text-muted">Stock levels & adjustments</p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} />
          Low stock only
        </label>
      </div>

      <div className="card overflow-hidden p-0">
        {loading ? (
          <div className="space-y-3 p-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : items.length === 0 ? (
          <EmptyState title="No inventory records" />
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead className="border-b border-[var(--color-border)] bg-table-muted">
              <tr>
                <th className="table-th">Product</th>
                <th className="table-th">SKU</th>
                <th className="table-th">Warehouse</th>
                <th className="table-th">Current</th>
                <th className="table-th">Reserved</th>
                <th className="table-th">Available</th>
                <th className="table-th">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => {
                const available = row.currentStock - row.reservedStock
                const isLow = row.currentStock <= row.lowStockThreshold
                const highlighted = highlightProductId === row.product.id
                return (
                  <tr
                    key={row.id}
                    id={`inv-product-${row.product.id}`}
                    className={`border-b border-[var(--color-border)] row-hover ${isLow ? 'bg-red-500/5' : ''} ${highlighted ? 'ring-2 ring-inset ring-gold/50 bg-gold/10' : ''}`}
                  >
                    <td className="table-td font-medium">{row.product.name}</td>
                    <td className="table-td font-mono text-xs text-muted">{row.product.sku || '—'}</td>
                    <td className="table-td">{row.warehouse.name}</td>
                    <td className="table-td">{row.currentStock}</td>
                    <td className="table-td">{row.reservedStock}</td>
                    <td className={`table-td ${available === 0 ? 'text-red-400' : ''}`}>{available}</td>
                    <td className="table-td">
                      <button type="button" className="btn-ghost text-xs text-gold" onClick={() => setAdjustRow(row)}>Adjust</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          </div>
        )}
      </div>

      <Modal open={!!adjustRow} onClose={() => setAdjustRow(null)} title="Adjust Stock">
        {adjustRow && (
          <div className="space-y-4">
            <p className="text-sm">{adjustRow.product.name} — current: {adjustRow.currentStock}</p>
            <div>
              <label className="label-xs">Change (+/-)</label>
              <input className="input" type="number" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="e.g. 10 or -5" />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-ghost" onClick={() => setAdjustRow(null)}>Cancel</button>
              <button type="button" className="btn-primary" onClick={adjust}>Apply</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
