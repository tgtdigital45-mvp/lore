export function CaregiversSection() {
  return (
    <section className="bg-bg-pure py-24 sm:py-32" aria-labelledby="caregivers-heading">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="lg:grid lg:grid-cols-2 lg:items-center lg:gap-16">
          <div className="hidden lg:block">
            <div className="relative">
              <div className="absolute -inset-4 rounded-[2rem] bg-brand-primary/5 blur-2xl" />
              <div className="relative grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="rounded-3xl bg-white p-6 shadow-xl ring-1 ring-black/5">
                    <div className="h-10 w-10 rounded-xl bg-clinical-treatment/10 flex items-center justify-center mb-4">
                      <HeartIcon className="h-6 w-6 text-clinical-treatment" />
                    </div>
                    <p className="font-bold text-text-primary">Dose Confirmada</p>
                    <p className="text-sm text-text-secondary mt-1">Sua mãe tomou a medicação às 08:32.</p>
                  </div>
                  <div className="rounded-3xl bg-white p-6 shadow-xl ring-1 ring-black/5">
                    <div className="h-10 w-10 rounded-xl bg-brand-primary/10 flex items-center justify-center mb-4">
                      <BellIcon className="h-6 w-6 text-brand-primary" />
                    </div>
                    <p className="font-bold text-text-primary">Alerta de Fadiga</p>
                    <p className="text-sm text-text-secondary mt-1">Nível de fadiga relatado como "Alto" hoje.</p>
                  </div>
                </div>
                <div className="pt-12 space-y-4">
                  <div className="rounded-3xl bg-white p-6 shadow-xl ring-1 ring-black/5">
                    <div className="h-10 w-10 rounded-xl bg-clinical-nutrition/10 flex items-center justify-center mb-4">
                      <UserGroupIcon className="h-6 w-6 text-clinical-nutrition" />
                    </div>
                    <p className="font-bold text-text-primary">Círculo de Cuidado</p>
                    <p className="text-sm text-text-secondary mt-1">3 familiares conectados à jornada.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h2 id="caregivers-heading" className="text-base font-semibold leading-7 text-brand-primary uppercase tracking-wide">
              Para Cuidadores e Familiares
            </h2>
            <p className="mt-2 text-3xl font-extrabold tracking-tight text-text-primary sm:text-4xl">
              Cuidado compartilhado, <br className="hidden sm:block" />
              <span className="text-brand-primary/80">ansiedade reduzida.</span>
            </p>
            <p className="mt-6 text-lg leading-8 text-text-secondary">
              O câncer não se enfrenta sozinho. OncoCare conecta o paciente à sua rede de apoio, 
              garantindo que todos estejam na mesma página, sem precisar de ligações constantes.
            </p>

            <div className="mt-10 space-y-8">
              <div className="relative pl-16">
                <dt className="text-lg font-bold leading-7 text-text-primary">
                  <div className="absolute left-0 top-0 flex h-12 w-12 items-center justify-center rounded-2xl bg-bg-soft ring-1 ring-black/5">
                    <EyeIcon className="h-6 w-6 text-brand-primary" />
                  </div>
                  Visibilidade em Tempo Real
                </dt>
                <dd className="mt-2 text-base leading-7 text-text-secondary">
                  Saiba instantaneamente se a medicação foi tomada ou se um sintoma novo foi registrado.
                </dd>
              </div>
              <div className="relative pl-16">
                <dt className="text-lg font-bold leading-7 text-text-primary">
                  <div className="absolute left-0 top-0 flex h-12 w-12 items-center justify-center rounded-2xl bg-bg-soft ring-1 ring-black/5">
                    <TruckIcon className="h-6 w-6 text-brand-primary" />
                  </div>
                  Logística de Apoio
                </dt>
                <dd className="mt-2 text-base leading-7 text-text-secondary">
                  Cuidadores podem ajudar na organização de exames e consultas, tudo centralizado no mesmo ecossistema.
                </dd>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function HeartIcon({ className }: { className?: string }) {
  return (
    <svg fill="currentColor" viewBox="0 0 24 24" className={className}>
      <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.5 3c1.343 0 2.508.535 3.398 1.406C11.792 3.535 12.957 3 14.3 3c2.786 0 5.25 2.322 5.25 5.25 0 3.924-2.438 7.11-4.736 9.271a25.158 25.158 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
    </svg>
  )
}

function BellIcon({ className }: { className?: string }) {
  return (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
    </svg>
  )
}

function UserGroupIcon({ className }: { className?: string }) {
  return (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a5.971 5.971 0 0 0-.941 3.197m0 0a5.971 5.971 0 0 0-.941 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
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

function TruckIcon({ className }: { className?: string }) {
  return (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.129-1.125V11.25c0-4.446-3.742-8.25-8.25-8.25H12m0 0V11.25m0-8.25H6.375c-.621 0-1.125.504-1.125 1.125v9m0 0h11.25m-11.25 0V11.25m11.25 0h11.25M12 15.75h1.5m-1.5 0H12v-1.5m0 1.5v1.5m0-1.5h-1.5" />
    </svg>
  )
}
