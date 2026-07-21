import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/** Scroll to top whenever the route changes so the footer isn't shown first. */
export default function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return null
}
