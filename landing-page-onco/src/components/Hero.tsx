export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-black/5 bg-gradient-to-b from-white to-[#F2F2F7] pt-[4.75rem] sm:pt-20">
      <div className="mx-auto max-w-6xl px-4 pb-20 pt-6 sm:px-6 lg:px-8 lg:pb-28 lg:pt-10">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-3 text-sm font-medium uppercase tracking-wide text-[#007AFF]">
            Aplicativo para pacientes oncológicos
          </p>
          <h1 className="text-balance text-3xl font-bold tracking-tight text-[#1C1C1E] sm:text-4xl lg:text-5xl">
            Seu tratamento oncológico, um dia de cada vez
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg text-[#3A3A3C] sm:text-xl">
            O app que transforma a rotina exaustiva do tratamento em registros
            simples de 10 segundos. Menos esquecimentos. Mais controle. Consultas
            mais produtivas.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row sm:flex-wrap">
            <a
              href="#download"
              className="inline-flex min-h-[44px] w-full max-w-xs items-center justify-center gap-2 rounded-xl bg-[#1C1C1E] px-6 py-3 text-base font-semibold text-white transition hover:bg-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1C1C1E] sm:w-auto"
            >
              <AppleIcon className="h-6 w-6" aria-hidden />
              Baixar na App Store
            </a>
            <a
              href="#download"
              className="inline-flex min-h-[44px] w-full max-w-xs items-center justify-center gap-2 rounded-xl border-2 border-[#1C1C1E] bg-white px-6 py-3 text-base font-semibold text-[#1C1C1E] transition hover:bg-[#F2F2F7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1C1C1E] sm:w-auto"
            >
              <PlayIcon className="h-6 w-6" aria-hidden />
              Baixar no Google Play
            </a>
          </div>

          <a
            href="#how-it-works"
            className="mt-6 inline-flex min-h-[44px] items-center justify-center text-base font-semibold text-[#007AFF] underline-offset-4 hover:underline"
          >
            Ver como funciona
          </a>

          <p className="mt-8 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-sm text-[#636366]">
            <span className="inline-flex items-center gap-1.5">
              <CheckBadgeIcon className="h-4 w-4 text-[#34C759]" aria-hidden />
              100% gratuito
            </span>
            <span className="hidden text-[#C7C7CC] sm:inline" aria-hidden>
              |
            </span>
            <span>Dados criptografados</span>
            <span className="hidden text-[#C7C7CC] sm:inline" aria-hidden>
              |
            </span>
            <span>LGPD compliant</span>
          </p>
        </div>
      </div>
    </section>
  )
}

function AppleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  )
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M3 20.5v-17c0-.59.47-1 1.02-.86l18 4.5c.62.16 1.02.75 1.02 1.36s-.4 1.2-1.02 1.36l-18 4.5c-.55.14-1.02-.27-1.02-.86z" />
    </svg>
  )
}

function CheckBadgeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  )
}
