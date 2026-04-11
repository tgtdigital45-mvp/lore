import { Outlet } from 'react-router-dom'
import { FloatingHeader } from '../components/FloatingHeader'
import { Footer } from '../components/Footer'
import { RouteScroll } from '../components/RouteScroll'

export function MainLayout() {
  return (
    <div className="flex min-h-svh flex-col bg-[#F2F2F7] text-[#1C1C1E]">
      <RouteScroll />
      <FloatingHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
