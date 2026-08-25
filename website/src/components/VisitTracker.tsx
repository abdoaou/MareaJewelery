import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const API_BASE = import.meta.env.VITE_API_URL || '/api/v1'
const API_KEY = import.meta.env.VITE_API_KEY || ''

function getSessionId() {
  let id = localStorage.getItem('marea_session_id')
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem('marea_session_id', id)
  }
  return id
}

function trackVisit(path: string) {
  fetch(`${API_BASE}/public/visit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      'x-session-id': getSessionId(),
    },
    body: JSON.stringify({ path }),
    keepalive: true,
  }).catch(() => {})
}

export default function VisitTracker() {
  const { pathname } = useLocation()

  useEffect(() => {
    trackVisit(pathname)
  }, [pathname])

  return null
}
