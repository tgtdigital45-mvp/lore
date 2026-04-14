export function B2BTeaser() {
  return (
    <section id="hospital" className="bg-bg-soft py-24 sm:py-32" aria-labelledby="hospital-heading">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="lg:grid lg:grid-cols-2 lg:items-center lg:gap-16">
          <div className="relative order-2 lg:order-1">
            <div className="relative overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/5">
              <img
                className="w-full object-cover"
                src="/dashboard-mockup.png"
                alt="Hospital Triage Dashboard Preview"
              />
            </div>
            {/* Overlay badge */}
            <div className="absolute -top-4 -right-4 rounded-2xl bg-brand-primary p-4 text-white shadow-xl">
              <p className="text-xs font-bold uppercase tracking-widest">Tempo Real</p>
              <p className="text-sm font-medium">Triagem Preditiva IA</p>
            </div>
          </div>

          <div className="order-1 mt-12 lg:order-2 lg:mt-0">
            <h2 id="hospital-heading" className="text-base font-semibold leading-7 text-brand-primary uppercase tracking-wide">
              Para Instituições de Saúde
            </h2>
            <p className="mt-2 text-3xl font-extrabold tracking-tight text-text-primary sm:text-4xl">
              Real World Data: <br className="hidden sm:block" />
              <span className="text-brand-primary/80">Decisões Clínicas Precisas.</span>
            </p>
            <p className="mt-6 text-lg leading-8 text-text-secondary">
              O Dashboard OncoCare permite que equipes de navegação visualizem alertas estruturados: febre, 
              nadir imunológico e toxicidade extrema. Reduzimos internações evitáveis e otimizamos o tempo em consultório.
            </p>

            <ul className="mt-10 space-y-4">
              {[
                'Painel de triagem inteligente com priorização por risco.',
                'Alertas configuráveis de biometria e sintomas graves.',
                'Relatórios consolidados inter-ciclos para agilidade clínica.',
                'Conexão instantânea via Código ID do paciente (LGPD).',
                'Integração nativa via API para prontuários eletrônicos.',
              ].map((item) => (
                <li key={item} className="flex items-start gap-4">
                  <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-primary/10">
                    <CheckIcon className="h-4 w-4 text-brand-primary" />
                  </div>
                  <span className="text-base font-medium text-text-primary">{item}</span>
                </li>
              ))}
            </ul>

            <div className="mt-10">
              <a
                href="mailto:comercial@oncocare.com.br"
                className="inline-flex items-center justify-center rounded-2xl bg-brand-primary px-8 py-4 text-lg font-bold text-white shadow-lg shadow-brand-primary/20 transition-all hover:bg-brand-secondary focus:outline-none"
              >
                Solicitar Demonstração B2B
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  )
}
