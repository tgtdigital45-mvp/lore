import { Link } from 'react-router-dom'

const navLinkClass =
  'px-4 py-2 text-sm font-medium text-slate-600 transition hover:text-slate-900 focus-visible:outline-none'

export function FloatingHeader() {
  return (
    <header className="fixed left-0 right-0 top-0 z-50 bg-white/70 backdrop-blur-xl border-b border-slate-100">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2 focus-visible:outline-none">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white font-black text-xl">
            A
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900">
            Aura Onco
          </span>
        </Link>

        <nav className="hidden items-center gap-2 md:flex">
          <Link to="/" className={navLinkClass}>Início</Link>
          <Link to="/sobre" className={navLinkClass}>Sobre nós</Link>
          <Link to="/funcionalidades" className={navLinkClass}>Funcionalidades</Link>
          <Link to="/hospitais" className={navLinkClass}>Para Clínicas</Link>
        </nav>

        <div className="flex items-center gap-4">
          <Link
            to="/contato"
            className="hidden text-sm font-medium text-slate-600 hover:text-slate-900 md:block"
          >
            Entrar
          </Link>
          <button
            className="rounded-full bg-slate-900 px-6 py-2.5 text-sm font-bold text-white shadow-lg transition hover:bg-black active:scale-95"
          >
            Começar agora
          </button>
        </div>
      </div>
    </header>
  )
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ')
}
