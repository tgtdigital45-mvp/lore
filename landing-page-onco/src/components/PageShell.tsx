import type { ReactNode } from 'react'

type PageShellProps = {
  title: string
  description?: string
  children: ReactNode
  /** Textos jurídicos longos */
  wide?: boolean
  lastUpdated?: string
}

export function PageShell({ title, description, children, wide, lastUpdated }: PageShellProps) {
  return (
    <article
      className={`mx-auto px-4 pb-12 pt-[calc(4.75rem+3rem)] sm:px-6 sm:pt-[calc(5rem+3rem)] lg:px-8 ${wide ? 'max-w-4xl' : 'max-w-3xl'}`}
    >
      <h1 className="text-3xl font-bold tracking-tight text-[#1C1C1E] sm:text-4xl">{title}</h1>
      {description ? <p className="mt-4 text-lg text-[#636366]">{description}</p> : null}
      {lastUpdated ? (
        <p className="mt-2 text-sm text-[#8E8E93]">Última atualização: {lastUpdated}</p>
      ) : null}
      <div className="mt-10 space-y-4 text-[#3A3A3C]">{children}</div>
    </article>
  )
}
