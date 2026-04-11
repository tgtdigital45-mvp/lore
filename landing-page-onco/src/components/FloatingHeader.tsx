import { Link } from 'react-router-dom'

const navLinkClass =
  'rounded-full px-3 py-2 text-sm font-medium text-[#3A3A3C] transition hover:bg-black/5 hover:text-[#1C1C1E] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007AFF]'

export function FloatingHeader() {
  return (
    <header className="pointer-events-none fixed left-0 right-0 top-4 z-50 bg-transparent px-3 sm:px-4">
      <div
        className="pointer-events-auto relative mx-auto flex max-w-5xl items-center justify-between gap-3 rounded-full border border-white/50 bg-white/65 py-2.5 pl-4 pr-2.5 shadow-[0_8px_32px_rgba(0,0,0,0.08)] ring-1 ring-black/5 backdrop-blur-xl backdrop-saturate-150 sm:pl-5 sm:pr-3"
        role="banner"
      >
        <Link
          to="/"
          className="relative z-10 shrink-0 text-lg font-bold tracking-tight text-[#007AFF] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007AFF] sm:text-xl"
        >
          Onco
        </Link>

        <nav
          className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-0.5 md:flex"
          aria-label="Principal"
        >
          <Link to="/#features-heading" className={navLinkClass}>
            Funcionalidades
          </Link>
          <Link to="/#b2b-heading" className={navLinkClass}>
            Hospitais
          </Link>
          <Link to="/sobre" className={navLinkClass}>
            Sobre
          </Link>
        </nav>

        <a
          href="/#download"
          className="relative z-10 inline-flex min-h-[40px] shrink-0 items-center justify-center rounded-full bg-[#007AFF] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0066DD] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007AFF] sm:px-5"
        >
          Baixar grátis
        </a>
      </div>
    </header>
  )
}
