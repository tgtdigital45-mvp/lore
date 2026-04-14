export function Accessibility() {
  const items = [
    {
      title: 'Precisão Motora',
      body: 'Botões de 44x44pt mínimo. Pensado para neuropatia periférica e momentos de fadiga extrema.',
      icon: HandIcon,
    },
    {
      title: 'Conforto Visual',
      body: 'Suporte nativo a Modo Escuro e Alto Contraste para dias de fotofobia pós-quimioterapia.',
      icon: EyeIcon,
    },
    {
      title: 'Fontes Escalonáveis',
      body: 'Respeita as configurações de acessibilidade do sistema. Se você precisa de fontes maiores, o OncoCare se adapta.',
      icon: TypeIcon,
    },
    {
      title: 'Interface Tátil',
      body: 'Sliders com feedback háptico. Menos esforço de digitação, mais facilidade no registro.',
      icon: CursorArrowRaysIcon,
    },
  ]

  return (
    <section className="bg-bg-soft py-24 sm:py-32" aria-labelledby="a11y-heading">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="a11y-heading" className="text-base font-semibold leading-7 text-brand-primary uppercase tracking-wide">
            Acessibilidade Inclusiva
          </h2>
          <p className="mt-2 text-3xl font-extrabold tracking-tight text-text-primary sm:text-4xl">
            Projetado para quando <br className="hidden sm:block" />
            <span className="text-brand-primary/80">você não está 100%.</span>
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item) => (
            <div key={item.title} className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-black/5 transition-all hover:shadow-lg">
              <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-primary/10">
                <item.icon className="h-5 w-5 text-brand-primary" />
              </div>
              <h3 className="text-lg font-bold text-text-primary">{item.title}</h3>
              <p className="mt-4 text-sm leading-6 text-text-secondary">{item.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function HandIcon({ className }: { className?: string }) {
  return (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.05 4.575a1.575 1.575 0 1 0-3.15 0v3m3.15-3v-1.5a1.575 1.575 0 0 1 3.15 0v1.5m-3.15 0 .075 5.925m3.075.75V4.575m0 0a1.575 1.575 0 0 1 3.15 0V15M6.9 7.575a1.575 1.575 0 1 0-3.15 0v2.25m3.15-2.25.075 3.3m-3.225-3.3v4.275a5.775 5.775 0 0 0 4.612 5.662l1.913.382a4.5 4.5 0 0 1 3.63 3.63L19 21.75" />
    </svg>
  )
}

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.43 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  )
}

function TypeIcon({ className }: { className?: string }) {
  return (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 21 15.75 9.75 21 21m-9-3h7.5M3 5.621a48.474 48.474 0 0 1 6-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 0 1-3.827-5.802" />
    </svg>
  )
}

function CursorArrowRaysIcon({ className }: { className?: string }) {
  return (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672 13.684 16.6m0 0-2.51 2.225.569-9.47 5.227 7.917-3.286-.672ZM12 2.25V4.5m5.834.166-1.591 1.591M20.25 10.5H18M18.757 17.243l-1.591-1.591m-9.915 2.505 1.591-1.591M3.75 10.5H6M4.509 4.666l1.591 1.591" />
    </svg>
  )
}
