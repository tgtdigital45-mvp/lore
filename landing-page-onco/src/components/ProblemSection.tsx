const problems = [
  {
    title: 'A Luta contra o "Chemo-Brain"',
    body:
      'A toxicidade do tratamento afeta a memória. "Tomei a dose das 8h?" A incerteza gera ansiedade. OncoCare elimina a dúvida com registros instantâneos.',
    icon: ClockIcon,
    color: 'clinical-vitals',
  },
  {
    title: 'O Fim do Viés de Memória',
    body:
      'No consultório, é difícil lembrar de cada dor ou náusea da semana retrasada. Relatos imprecisos dificultam o ajuste clínico. Nós estruturamos sua jornada.',
    icon: ChartBarIcon,
    color: 'clinical-symptoms',
  },
  {
    title: 'Informação que Liberta',
    body:
      'Exames no app do laboratório, receitas em papel, dúvidas no WhatsApp. Fragmentação consome energia. OncoCare centraliza o que importa.',
    icon: DocumentTextIcon,
    color: 'clinical-treatment',
  },
]

export function ProblemSection() {
  return (
    <section className="bg-bg-soft py-24 sm:py-32" aria-labelledby="problem-heading">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:text-center">
          <h2 className="text-base font-semibold leading-7 text-brand-primary uppercase tracking-wide">
            O Problema Invisível
          </h2>
          <p id="problem-heading" className="mt-2 text-3xl font-extrabold tracking-tight text-text-primary sm:text-4xl">
            O tratamento já é complexo. <br className="hidden sm:block" />
            <span className="text-brand-primary/80">A gestão não precisa ser.</span>
          </p>
          <p className="mt-6 text-lg leading-8 text-text-secondary">
            Pacientes oncológicos enfrentam uma sobrecarga cognitiva brutal. 
            Fragmentação de dados e falhas de memória impactam diretamente na eficácia clínica.
          </p>
        </div>

        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
          <ul className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
            {problems.map((p) => (
              <li key={p.title} className="flex flex-col">
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-lg ring-1 ring-black/5">
                  <p.icon className={`h-6 w-6 text-${p.color}`} aria-hidden="true" />
                </div>
                <h3 className="text-xl font-bold leading-7 text-text-primary">
                  {p.title}
                </h3>
                <p className="mt-4 flex flex-auto text-base leading-7 text-text-secondary">
                  {p.body}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  )
}

function ChartBarIcon({ className }: { className?: string }) {
  return (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V19.875c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
    </svg>
  )
}

function DocumentTextIcon({ className }: { className?: string }) {
  return (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
  )
}
