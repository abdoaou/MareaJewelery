import { useEffect, useState } from 'react'
import { Mail } from 'lucide-react'
import { customersApi } from '../services/api'
import type { User } from '../types'
import { Badge } from '../components/ui/Badge'
import { EmptyState, Skeleton } from '../components/ui/EmptyState'
import { Modal } from '../components/ui/Modal'
import { useNotificationStore } from '../store/notificationStore'
import { format } from 'date-fns'

export function CustomersPage() {
  const [customers, setCustomers] = useState<(User & { _count?: { orders: number }; createdAt?: string })[]>([])
  const [totalCustomers, setTotalCustomers] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [emailOpen, setEmailOpen] = useState(false)
  const [emailSubject, setEmailSubject] = useState('')
  const [emailMessage, setEmailMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [testing, setTesting] = useState(false)
  const pushToast = useNotificationStore((s) => s.pushToast)

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true)
      const params: Record<string, string> = { limit: '50' }
      if (search) params.search = search
      customersApi
        .list(params)
        .then((r) => {
          setCustomers(r.data?.items || [])
          setTotalCustomers(r.data?.total || 0)
        })
        .finally(() => setLoading(false))
    }, 300)
    return () => clearTimeout(t)
  }, [search])

  const handleBroadcast = async () => {
    if (!emailSubject.trim() || !emailMessage.trim()) return
    if (!confirm(`Send this email to all ${totalCustomers} customers?`)) return

    setSending(true)
    try {
      const res = await customersApi.broadcastEmail({
        subject: emailSubject.trim(),
        message: emailMessage.trim(),
      })
      const sent = res.data?.sent ?? 0
      const failed = res.data?.failed ?? 0
      const skipped = res.data?.skipped ?? 0
      const firstFailure = res.data?.failures?.[0]?.error
      pushToast({
        type: failed > 0 && sent === 0 ? 'error' : sent > 0 && failed > 0 ? 'warning' : 'success',
        title: failed > 0 && sent === 0 ? 'Email failed' : sent > 0 && failed > 0 ? 'Partially sent' : 'Emails sent',
        message:
          firstFailure && sent === 0
            ? firstFailure
            : `Delivered ${sent} · failed ${failed} · skipped ${skipped}. Check your admin inbox and spam.`,
      })
      if (sent > 0) {
        setEmailOpen(false)
        setEmailSubject('')
        setEmailMessage('')
      }
    } catch (err) {
      pushToast({
        type: 'error',
        title: 'Email failed',
        message: err instanceof Error ? err.message : 'Could not send emails',
      })
    } finally {
      setSending(false)
    }
  }

  const handleTest = async () => {
    if (!emailSubject.trim() || !emailMessage.trim()) return
    setTesting(true)
    try {
      const res = await customersApi.testEmail({
        subject: emailSubject.trim(),
        message: emailMessage.trim(),
      })
      pushToast({
        type: 'success',
        title: 'Test email sent',
        message: `Check ${res.data?.to || 'your admin inbox'} (and spam).`,
      })
    } catch (err) {
      pushToast({
        type: 'error',
        title: 'Test email failed',
        message: err instanceof Error ? err.message : 'Could not send test email',
      })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Customers</h1>
          <p className="text-sm text-muted">{totalCustomers} total customers</p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
          <input
            className="input w-full sm:max-w-xs"
            placeholder="Search customers…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="button" className="btn-primary inline-flex items-center gap-2" onClick={() => setEmailOpen(true)}>
            <Mail size={16} />
            Email customers
          </button>
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        {loading ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : customers.length === 0 ? (
          <EmptyState title="No customers" description="Registered customers will appear here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th className="table-th">#</th>
                  <th className="table-th">Customer</th>
                  <th className="table-th">Email</th>
                  <th className="table-th">Phone</th>
                  <th className="table-th">Status</th>
                  <th className="table-th">Orders</th>
                  <th className="table-th">Joined</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c, index) => (
                  <tr key={c.id} className="table-row">
                    <td className="table-td text-muted">{index + 1}</td>
                    <td className="table-td">
                      {c.firstName} {c.lastName}
                    </td>
                    <td className="table-td">{c.email}</td>
                    <td className="table-td font-mono text-xs">{c.phone || '—'}</td>
                    <td className="table-td">
                      <Badge status={c.status} />
                    </td>
                    <td className="table-td">{c._count?.orders ?? 0}</td>
                    <td className="table-td">
                      {c.createdAt ? format(new Date(c.createdAt), 'dd MMM yyyy') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={emailOpen} onClose={() => !sending && !testing && setEmailOpen(false)} title="Email all customers" wide>
        <p className="text-sm text-muted">
          Sends to all <strong>{totalCustomers}</strong> customer accounts (not admin users). Use{' '}
          <code className="text-gold">{'{{name}}'}</code> for first name. Fake addresses like{' '}
          <code>@example.com</code> are skipped. Ask recipients to check spam.
        </p>

        <label className="mt-4 block text-sm">
          Subject
          <input
            className="input mt-1 w-full"
            value={emailSubject}
            onChange={(e) => setEmailSubject(e.target.value)}
            placeholder="New collection is live"
            maxLength={200}
          />
        </label>

        <label className="mt-4 block text-sm">
          Message
          <textarea
            className="input mt-1 min-h-[180px] w-full resize-y"
            value={emailMessage}
            onChange={(e) => setEmailMessage(e.target.value)}
            placeholder={'Hi {{name}},\n\nWe just launched our spring collection...'}
            maxLength={10000}
          />
        </label>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="btn-secondary"
            disabled={sending || testing}
            onClick={() => setEmailOpen(false)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn-secondary"
            disabled={sending || testing || !emailSubject.trim() || !emailMessage.trim()}
            onClick={handleTest}
          >
            {testing ? 'Sending test…' : 'Send test to me'}
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={sending || testing || !emailSubject.trim() || !emailMessage.trim()}
            onClick={handleBroadcast}
          >
            {sending ? 'Sending…' : `Send to ${totalCustomers} customers`}
          </button>
        </div>
      </Modal>
    </div>
  )
}
