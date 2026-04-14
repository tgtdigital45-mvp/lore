export function FinalCTA() {
  return (
    <section id="download" className="relative overflow-hidden bg-bg-soft py-24 sm:py-32" aria-labelledby="cta-heading">
      {/* Decorative background circle */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 h-[800px] w-[800px] bg-[radial-gradient(circle,rgba(0,79,99,0.08)_0%,transparent_70%)] blur-3xl opacity-50" />
      
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[3rem] bg-brand-primary px-8 py-20 text-center shadow-2xl sm:px-16 sm:py-24">
          <div className="relative z-10 mx-auto max-w-2xl">
            <h2 id="cta-heading" className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Retome o controle da sua jornada. <br />
              <span className="text-white/80">Um dia de cada vez.</span>
            </h2>
            <p className="mt-6 text-lg leading-8 text-white/90">
              Junte-se a milhares de pacientes que transformaram o caos do tratamento em clareza clínica. 
              Gratuito para sempre. Privado por design.
            </p>
            
            <div className="mt-10 flex flex-col items-center justify-center gap-6 sm:flex-row">
              <a
                href="#"
                className="group inline-flex items-center justify-center gap-3 rounded-2xl bg-white px-8 py-4 text-lg font-bold text-brand-primary transition-all hover:scale-105 hover:bg-bg-soft"
              >
                <AppleIcon className="h-6 w-6" />
                App Store
              </a>
              <a
                href="#"
                className="group inline-flex items-center justify-center gap-3 rounded-2xl border-2 border-white/30 bg-white/10 px-8 py-4 text-lg font-bold text-white backdrop-blur-sm transition-all hover:bg-white/20"
              >
                <PlayStoreIcon className="h-6 w-6" />
                Google Play
              </a>
            </div>
            
            <p className="mt-8 text-sm font-medium text-white/70">
              Cadastro em 2 minutos. Primeiro registro em 10 segundos.
            </p>
          </div>
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

function PlayStoreIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.302 11.594L2.091 1.144C1.867.926 1.564.814 1.25.814c-.69 0-1.25.56-1.25 1.25v19.872c0 .69.56 1.25 1.25 1.25.314 0 .617-.112.841-.33l10.211-10.45c.196-.201.196-.525 0-.726zM23.34 11.594l-7.23-4.131-4.103 4.2c-.196.201-.196.525 0 .726l4.103 4.2 7.23-4.131c.6-.343.6-.921 0-1.264zM1.986.993l14.124 8.071-4.103 4.2-10.021-12.271zM1.986 23.007l10.021-12.271 4.103 4.2-14.124 8.071z" />
    </svg>
  )
}
