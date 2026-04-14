import type { ReactNode } from 'react'

type PageShellProps = {
  title: string
  description?: string
  children: ReactNode
  /** 'medium' (3xl), 'large' (5xl), 'full' (7xl) */
  size?: 'medium' | 'large' | 'full'
  lastUpdated?: string
}

export function PageShell({ title, description, children, size = 'medium', lastUpdated }: PageShellProps) {
  const maxWidthClass = {
    medium: 'max-w-3xl',
    large: 'max-w-5xl',
    full: 'max-w-7xl',
  }[size]

  return (
    <article
      className={`mx-auto px-4 pb-20 pt-[calc(4.75rem+3rem)] sm:px-6 sm:pt-[calc(5rem+4rem)] lg:px-8 ${maxWidthClass}`}
    >
      <div className={size === 'full' ? '' : ''}>
        <h1 className="text-4xl font-extrabold tracking-tight text-[#1C1C1E] sm:text-5xl">{title}</h1>
        {description ? <p className="mt-4 text-xl text-[#636366] max-w-3xl">{description}</p> : null}
        {lastUpdated ? (
          <p className="mt-2 text-sm text-[#8E8E93]">Última atualização: {lastUpdated}</p>
        ) : null}
      </div>
      <div className="mt-16 space-y-16 text-[#3A3A3C]">{children}</div>
    </article>
  )
}

