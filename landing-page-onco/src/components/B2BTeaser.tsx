const bullets = [
  'Painel de triagem com priorização automática por risco',
  'Alertas configuráveis (febre ≥38°C, sintomas graves)',
  'Auditoria HIPAA-ready de acessos a prontuários',
  'Comunicação institucional via WhatsApp Cloud API',
  'Integração via API REST',
]

export function B2BTeaser() {
  return (
    <section className="border-b border-black/5 bg-[#1C1C1E] py-16 text-white sm:py-20" aria-labelledby="b2b-heading">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 id="b2b-heading" className="text-2xl font-bold tracking-tight sm:text-3xl">
              Para instituições de saúde
            </h2>
            <p className="mt-3 text-lg text-white/80">Triagem preditiva alimentada por dados do mundo real</p>
            <p className="mt-6 text-white/90">
              O Dashboard Onco permite que equipes de navegação oncológica visualizem alertas em tempo real: febre,
              sintomas graves, pacientes em nadir. Menos ligações de emergência. Intervenções mais precoces.
            </p>
          </div>
          <div className="rounded-2xl bg-white/5 p-6 ring-1 ring-white/10">
            <ul className="space-y-3">
              {bullets.map((b) => (
                <li key={b} className="flex gap-3 text-sm sm:text-base">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#34C759]" aria-hidden />
                  <span className="text-white/90">{b}</span>
                </li>
              ))}
            </ul>
            <a
              href="mailto:comercial@onco.app?subject=Interesse%20no%20Dashboard%20Onco"
              className="mt-8 inline-flex min-h-[44px] w-full items-center justify-center rounded-xl bg-[#007AFF] px-6 py-3 text-center font-semibold text-white transition hover:bg-[#0066DD] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Falar com nossa equipe comercial
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
