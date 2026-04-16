export function HowItWorks() {
  const steps = [
    {
      n: '1',
      title: 'Perfil Clínico Inteligente',
      desc: 'Tipo de câncer, estágio e protocolo. Uma configuração única, em menos de 2 minutos.',
    },
    {
      n: '2',
      title: 'Registros em Segundos',
      desc: 'Abra o app, registre seus sintomas e biometria. Simples, rápido e clínico.',
    },
    {
      n: '3',
      title: 'Decisão Baseada em Dados',
      desc: 'Exporte dossiês PDF para seu médico. Transforme memória falha em evidência clínica.',
    },
  ]

  return (
    <section id="how-it-works" className="bg-bg-soft py-24 sm:py-32" aria-labelledby="how-heading">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="how-heading" className="text-base font-semibold leading-7 text-brand-primary uppercase tracking-wide">
            Jornada Aura Onco
          </h2>
          <p className="mt-2 text-3xl font-extrabold tracking-tight text-text-primary sm:text-4xl">
            Retome o controle em <br className="hidden sm:block" />
            <span className="text-brand-primary/80">3 passos simples.</span>
          </p>
        </div>

        <div className="mt-20 grid grid-cols-1 gap-12 lg:grid-cols-3">
          {steps.map((step, idx) => (
            <div key={step.n} className="relative flex flex-col items-center text-center">
              {/* Connector Line (Desktop) */}
              {idx < steps.length - 1 && (
                <div className="absolute left-[calc(50%+2rem)] top-10 hidden h-0.5 w-[calc(100%-4rem)] bg-brand-primary/10 lg:block" />
              )}
              
              <div className="flex h-20 w-20 items-center justify-center rounded-[2rem] bg-white shadow-xl ring-1 ring-black/5">
                <span className="text-2xl font-black text-brand-primary">{step.n}</span>
              </div>
              
              <h3 className="mt-8 text-xl font-bold text-text-primary">{step.title}</h3>
              <p className="mt-4 text-base leading-7 text-text-secondary">
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
