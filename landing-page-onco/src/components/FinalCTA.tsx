export function FinalCTA() {
  return (
    <section
      id="download"
      className="border-b border-black/5 bg-gradient-to-b from-white to-[#E8F2FF] py-16 sm:py-20"
      aria-labelledby="download-heading"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 id="download-heading" className="text-2xl font-bold tracking-tight text-[#1C1C1E] sm:text-3xl">
            Comece hoje. Um dia de cada vez.
          </h2>
          <p className="mt-4 text-lg text-[#3A3A3C]">
            Baixe gratuitamente e transforme sua rotina de tratamento.
          </p>
        </div>

        <div className="mt-10 flex flex-col items-center justify-center gap-8 lg:flex-row lg:items-start">
          <div className="flex w-full max-w-md flex-col gap-4 sm:flex-row sm:justify-center">
            <a
              href="#"
              className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-[#1C1C1E] px-6 py-3 font-semibold text-white transition hover:bg-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1C1C1E]"
              aria-label="Baixar na App Store (link em breve)"
            >
              <AppleIcon className="h-6 w-6" />
              App Store
            </a>
            <a
              href="#"
              className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl border-2 border-[#1C1C1E] bg-white px-6 py-3 font-semibold text-[#1C1C1E] transition hover:bg-[#F2F2F7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1C1C1E]"
              aria-label="Baixar no Google Play (link em breve)"
            >
              <PlayStoreIcon className="h-6 w-6" />
              Google Play
            </a>
          </div>

          <div className="flex flex-col items-center rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
            <QrPlaceholder />
            <p className="mt-3 text-center text-sm text-[#636366]">Escaneie para baixar</p>
          </div>
        </div>

        <p className="mt-10 text-center text-[#636366]">
          Cadastro em 2 minutos. Primeiro registro em 10 segundos.
        </p>
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

function PlayStoreIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path fill="#EA4335" d="M3.6 20.4 12 12.8l3.1 3.1L3.6 20.4z" />
      <path fill="#FBBC04" d="M12 12.8 3.6 3.6v16.8l8.4-7.6z" />
      <path fill="#34A853" d="M20.4 10.8 15.1 12.8 12 9.7l8.4-4.9c.4.7.5 1.5.5 2.4 0 .9-.2 1.7-.5 2.4z" />
      <path fill="#4285F4" d="M3.6 3.6 20.4 10.8c-.3-.5-.7-1-1.2-1.4L12 9.7 3.6 3.6z" />
    </svg>
  )
}

function QrPlaceholder() {
  return (
    <svg
      width={120}
      height={120}
      viewBox="0 0 120 120"
      className="text-[#1C1C1E]"
      aria-hidden
    >
      <rect width="120" height="120" fill="white" rx="8" />
      <g fill="currentColor">
        {[
          [0, 0],
          [8, 0],
          [16, 0],
          [0, 8],
          [16, 8],
          [0, 16],
          [8, 16],
          [16, 16],
          [32, 0],
          [48, 0],
          [40, 8],
          [56, 8],
          [64, 0],
          [72, 0],
          [80, 0],
          [88, 0],
          [96, 0],
          [104, 0],
          [32, 8],
          [64, 8],
          [96, 8],
          [104, 8],
          [112, 8],
          [24, 16],
          [32, 16],
          [48, 16],
          [56, 16],
          [72, 16],
          [80, 16],
          [88, 16],
          [96, 16],
          [104, 16],
          [112, 16],
          [0, 24],
          [16, 24],
          [24, 24],
          [40, 24],
          [48, 24],
          [56, 24],
          [64, 24],
          [72, 24],
          [80, 24],
          [88, 24],
          [96, 24],
          [104, 24],
          [112, 24],
        ].map(([x, y], i) => (
          <rect key={i} x={x} y={y} width="6" height="6" rx="1" />
        ))}
      </g>
    </svg>
  )
}
