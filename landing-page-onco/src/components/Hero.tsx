export function Hero() {
  return (
    <section className="relative z-10 bg-bg-pure pt-[4.75rem] sm:pt-20 lg:pt-32">
      {/* Subtle background abstract element */}
      <div className="absolute top-0 right-0 -z-10 h-[600px] w-[600px] bg-[radial-gradient(circle,rgba(0,79,99,0.05)_0%,transparent_70%)] blur-3xl" />
      
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="lg:grid lg:grid-cols-12 lg:gap-8">
          <div className="sm:text-center lg:col-span-6 lg:text-left">
            <p className="mb-4 inline-flex items-center rounded-full bg-brand-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-primary">
              <span className="mr-2 flex h-2 w-2 rounded-full bg-brand-primary animate-pulse" />
              SaMD · Inteligência Clínica Preditiva
            </p>
            <h1 className="text-balance text-4xl font-extrabold tracking-tight text-text-primary sm:text-5xl lg:text-6xl">
              Seu tratamento, <br />
              <span className="text-brand-primary">um dia de cada vez.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-pretty text-lg leading-8 text-text-secondary sm:text-xl lg:max-w-none">
              OncoCare transforma a jornada oncológica em registros simples de 10 segundos. 
              Reduzimos a sobrecarga cognitiva para pacientes e entregamos dados acionáveis em tempo real para hospitais.
            </p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center lg:justify-start">
              <a
                href="#download"
                className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-primary px-8 py-4 text-lg font-bold text-white shadow-xl shadow-brand-primary/20 transition-all hover:scale-105 hover:bg-brand-secondary focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2"
              >
                Começar agora
                <ArrowRightIcon className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </a>
              <a
                href="#hospital"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-brand-primary/20 bg-white px-8 py-4 text-lg font-bold text-brand-primary transition-all hover:bg-bg-soft hover:border-brand-primary/40 focus:outline-none"
              >
                Soluções Hospitalares
              </a>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-text-secondary">
              <div className="flex items-center gap-1.5">
                <ShieldCheckIcon className="h-5 w-5 text-clinical-nutrition" />
                <span>100% LGPD Compliant</span>
              </div>
              <div className="flex items-center gap-1.5">
                <LockClosedIcon className="h-5 w-5 text-clinical-nutrition" />
                <span>Dados Criptografados</span>
              </div>
            </div>
          </div>

          <div className="relative mt-12 sm:mx-auto sm:max-w-lg lg:col-span-6 lg:mx-0 lg:mt-0 lg:flex lg:max-w-none lg:items-center">
            <div className="relative mx-auto w-full lg:max-w-md">
              <div className="relative block w-full overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/5">
                <img
                  className="w-full object-cover"
                  src="/app-mockup.png"
                  alt="OncoCare App Interface"
                />
              </div>
              {/* Decorative elements */}
              <div className="absolute -bottom-6 -left-6 z-10 hidden rounded-2xl bg-white p-4 shadow-xl lg:block">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 flex items-center justify-center rounded-full bg-clinical-vitals/10">
                    <HeartIcon className="h-6 w-6 text-clinical-vitals" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-text-secondary uppercase">Sinais Vitais</p>
                    <p className="text-lg font-black text-text-primary">36.6 °C</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
    </svg>
  )
}

function ShieldCheckIcon({ className }: { className?: string }) {
  return (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
    </svg>
  )
}

function LockClosedIcon({ className }: { className?: string }) {
  return (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
    </svg>
  )
}

function HeartIcon({ className }: { className?: string }) {
  return (
    <svg fill="currentColor" viewBox="0 0 24 24" className={className}>
      <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.5 3c1.343 0 2.508.535 3.398 1.406C11.792 3.535 12.957 3 14.3 3c2.786 0 5.25 2.322 5.25 5.25 0 3.924-2.438 7.11-4.736 9.271a25.158 25.158 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
    </svg>
  )
}
