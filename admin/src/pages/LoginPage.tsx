import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Gem } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { enableAlerts } from '../utils/browserNotifications'
import { unlockNotificationAudio } from '../utils/notificationSound'

export function LoginPage() {
  const [email, setEmail] = useState('admin@marea.com')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const login = useAuthStore((s) => s.login)
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      await unlockNotificationAudio()
      await enableAlerts()
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-surface)] px-4">
      <div className="card w-full max-w-md">
        <div className="mb-8 text-center">
          <Gem className="mx-auto text-gold" size={36} />
          <p className="mt-3 text-xs tracking-[0.3em] text-gold uppercase">Marea</p>
          <h1 className="mt-2 text-2xl font-light">Admin Dashboard</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs text-white/50">Email</label>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="mb-1 block text-xs text-white/50">Password</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
