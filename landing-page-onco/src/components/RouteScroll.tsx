import { useLayoutEffect } from 'react'
import { useLocation } from 'react-router-dom'

export function RouteScroll() {
  const { pathname, hash } = useLocation()

  useLayoutEffect(() => {
    if (hash) {
      const id = hash.startsWith('#') ? hash.slice(1) : hash
      const el = document.getElementById(id)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        return
      }
    }
    window.scrollTo(0, 0)
  }, [pathname, hash])

  return null
}
