import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Gift } from 'lucide-react'
import { wheelApi, type WheelPrize, type WheelSpinRow, type WheelStats } from '../services/api'
import { Modal } from '../components/ui/Modal'
import { EmptyState, Skeleton } from '../components/ui/EmptyState'

const PRIZE_TYPES = ['DISCOUNT', 'FREE_SHIPPING', 'FREE_GIFT', 'NO_PRIZE'] as const

const emptyPrize = {
  name: '',
  type: 'DISCOUNT' as const,
  value: '',
  probability: '10',
  stock: '',
  active: true,
  sortOrder: '0',
  expiresAt: '',
}

export function WheelPage() {
  const [tab, setTab] = useState<'prizes' | 'spins'>('prizes')
  const [stats, setStats] = useState<WheelStats | null>(null)
  const [prizes, setPrizes] = useState<WheelPrize[]>([])
  const [spins, setSpins] = useState<WheelSpinRow[]>([])
  const [spinFilter, setSpinFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(emptyPrize)
  const [editId, setEditId] = useState<string | null>(null)

  async function loadStats() {
    const res = await wheelApi.stats()
    setStats(res.data || null)
  }

  async function loadPrizes() {
    const res = await wheelApi.listPrizes()
    setPrizes(res.data || [])
  }

  async function loadSpins(status = spinFilter) {
    const res = await wheelApi.listSpins(status === 'all' ? {} : { status })
    setSpins(res.data || [])
  }

  async function loadAll() {
    setLoading(true)
    try {
      await Promise.all([loadStats(), loadPrizes(), loadSpins()])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadAll()
  }, [])

  useEffect(() => {
    if (tab === 'spins') void loadSpins(spinFilter)
  }, [tab, spinFilter])

  function openCreate() {
    setForm(emptyPrize)
    setEditId(null)
    setError('')
    setModal(true)
  }

  function openEdit(p: WheelPrize) {
    setForm({
      name: p.name,
      type: p.type as typeof emptyPrize.type,
      value: p.value != null ? String(p.value) : '',
      probability: String(p.probability),
      stock: p.stock != null ? String(p.stock) : '',
      active: p.active,
      sortOrder: String(p.sortOrder),
      expiresAt: p.expiresAt ? p.expiresAt.slice(0, 16) : '',
    })
    setEditId(p.id)
    setError('')
    setModal(true)
  }

  async function save() {
    if (!form.name.trim()) {
      setError('Name is required')
      return
    }
    setSaving(true)
    setError('')
    const payload = {
      name: form.name.trim(),
      type: form.type,
      value: form.type === 'DISCOUNT' && form.value ? Number(form.value) : null,
      probability: Number(form.probability),
      stock: form.stock === '' ? null : Number(form.stock),
      active: form.active,
      sortOrder: Number(form.sortOrder) || 0,
      expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
    }
    try {
      if (editId) await wheelApi.updatePrize(editId, payload)
      else await wheelApi.createPrize(payload)
      setModal(false)
      await Promise.all([loadPrizes(), loadStats()])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function deactivate(id: string) {
    if (!confirm('Deactivate this prize?')) return
    await wheelApi.deletePrize(id)
    await Promise.all([loadPrizes(), loadStats()])
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Gift className="text-gold" size={22} />
          <h1 className="text-xl font-semibold">Lucky Wheel</h1>
        </div>
        {tab === 'prizes' && (
          <button type="button" onClick={openCreate} className="btn-primary flex items-center gap-2 text-sm">
            <Plus size={16} />
            Add prize
          </button>
        )}
      </div>

      {loading && !stats ? (
        <Skeleton className="h-24 w-full" />
      ) : stats ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ['Total spins', stats.totalSpins],
            ['Winners', stats.totalWinners],
            ['Coupons used', stats.couponsUsed],
            ['Coupons remaining', stats.couponsRemaining],
            ['Most won', stats.mostWonPrize?.name || '—'],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4">
              <p className="text-xs text-muted">{label}</p>
              <p className="mt-1 text-lg font-semibold">{value}</p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="flex gap-2 border-b border-[var(--color-border)]">
        {(['prizes', 'spins'] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`border-b-2 px-4 py-2 text-sm capitalize transition ${
              tab === key ? 'border-gold text-gold' : 'border-transparent text-muted'
            }`}
          >
            {key}
          </button>
        ))}
      </div>

      {tab === 'prizes' && (
        <>
          {loading ? (
            <Skeleton className="h-40 w-full" />
          ) : !prizes.length ? (
            <EmptyState title="No prizes" description="Add wheel segments to get started." />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[var(--color-border)]">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)] text-muted">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Prob.</th>
                    <th className="px-4 py-3">Stock</th>
                    <th className="px-4 py-3">Active</th>
                    <th className="px-4 py-3">Expires</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {prizes.map((p) => (
                    <tr key={p.id} className="border-b border-[var(--color-border)] last:border-0">
                      <td className="px-4 py-3 font-medium">{p.name}</td>
                      <td className="px-4 py-3 text-muted">{p.type}</td>
                      <td className="px-4 py-3">{p.probability}</td>
                      <td className="px-4 py-3">{p.stock ?? '∞'}</td>
                      <td className="px-4 py-3">{p.active ? 'Yes' : 'No'}</td>
                      <td className="px-4 py-3 text-muted">
                        {p.expiresAt ? new Date(p.expiresAt).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button type="button" onClick={() => openEdit(p)} className="btn-ghost rounded p-1.5">
                            <Pencil size={15} />
                          </button>
                          <button type="button" onClick={() => deactivate(p.id)} className="btn-ghost rounded p-1.5 text-red-400">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {tab === 'spins' && (
        <>
          <select
            value={spinFilter}
            onChange={(e) => setSpinFilter(e.target.value)}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm"
          >
            <option value="all">All spins</option>
            <option value="claimed">Claimed</option>
            <option value="unclaimed">Unclaimed winners</option>
            <option value="used">Used coupons</option>
            <option value="unused">Unused coupons</option>
          </select>

          {!spins.length ? (
            <EmptyState title="No spins yet" description="Spins will appear here once visitors use the wheel." />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[var(--color-border)]">
              <table className="w-full min-w-[800px] text-left text-sm">
                <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)] text-muted">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Prize</th>
                    <th className="px-4 py-3">Coupon</th>
                    <th className="px-4 py-3">Claimed</th>
                    <th className="px-4 py-3">Used</th>
                  </tr>
                </thead>
                <tbody>
                  {spins.map((s) => (
                    <tr key={s.id} className="border-b border-[var(--color-border)] last:border-0">
                      <td className="px-4 py-3 text-muted">{new Date(s.createdAt).toLocaleString()}</td>
                      <td className="px-4 py-3">{s.user?.email || s.sessionId?.slice(0, 8) || '—'}</td>
                      <td className="px-4 py-3">{s.prize?.name}</td>
                      <td className="px-4 py-3 font-mono text-xs">{s.couponCode || '—'}</td>
                      <td className="px-4 py-3">{s.claimedAt ? 'Yes' : 'No'}</td>
                      <td className="px-4 py-3">{s.usedAt ? 'Yes' : 'No'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editId ? 'Edit prize' : 'New prize'}>
        <div className="space-y-4">
          {error && <p className="text-sm text-red-400">{error}</p>}
          <label className="block text-sm">
            Name
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            Type
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as typeof form.type })}
              className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2"
            >
              {PRIZE_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>
          {form.type === 'DISCOUNT' && (
            <label className="block text-sm">
              Discount value (%)
              <input
                type="number"
                value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2"
              />
            </label>
          )}
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              Probability weight
              <input
                type="number"
                step="0.01"
                value={form.probability}
                onChange={(e) => setForm({ ...form, probability: e.target.value })}
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              Stock (empty = unlimited)
              <input
                type="number"
                value={form.stock}
                onChange={(e) => setForm({ ...form, stock: e.target.value })}
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2"
              />
            </label>
          </div>
          <label className="block text-sm">
            Sort order
            <input
              type="number"
              value={form.sortOrder}
              onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
              className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            Expires at
            <input
              type="datetime-local"
              value={form.expiresAt}
              onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
              className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2"
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
            />
            Active
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModal(false)} className="btn-ghost px-4 py-2 text-sm">
              Cancel
            </button>
            <button type="button" onClick={save} disabled={saving} className="btn-primary px-4 py-2 text-sm">
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
