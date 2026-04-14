export function SecuritySection() {
  return (
    <section className="bg-bg-pure py-24 sm:py-32" aria-labelledby="security-heading">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 id="security-heading" className="text-base font-semibold leading-7 text-brand-primary uppercase tracking-wide">
            Segurança de Nível Hospitalar
          </h2>
          <p className="mt-2 text-3xl font-extrabold tracking-tight text-text-primary sm:text-4xl">
            Dados de saúde merecem <br className="hidden sm:block" />
            <span className="text-brand-primary/80">proteção bancária.</span>
          </p>
          <p className="mt-6 text-lg leading-8 text-text-secondary">
            Construído sob os pilares da LGPD, o OncoCare garante que suas informações clínicas 
            estejam blindadas, acessíveis apenas a você e a quem você autorizar expressamente.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              title: 'Criptografia de Ponta a Ponta',
              body: 'Seus registros são protegidos com TLS 1.3 e AES-256. Dados em repouso e em trânsito com segurança militar.',
              icon: LockShieldIcon,
            },
            {
              title: 'Soberania sobre seus Dados',
              body: 'Exporte seus registros ou delete sua conta a qualquer momento. Você é o único dono da sua jornada clínica.',
              icon: UserCircleIcon,
            },
            {
              title: 'Controle de Acesso Hospitalar',
              body: 'O vínculo com instituições de saúde é 100% controlado por você. Autorize e revogue acessos instantaneamente.',
              icon: HospitalIcon,
            },
          ].map((item) => (
            <div key={item.title} className="rounded-3xl border border-bg-soft bg-bg-soft/50 p-8 transition-all hover:bg-white hover:shadow-xl">
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
                <item.icon className="h-6 w-6 text-brand-primary" />
              </div>
              <h3 className="text-xl font-bold text-text-primary">{item.title}</h3>
              <p className="mt-4 text-base leading-7 text-text-secondary">{item.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 flex flex-wrap justify-center gap-4">
          {['LGPD Compliant', 'HIPAA Scalable', 'AES-256 Encryption', 'Cloud Health Certified'].map((badge) => (
            <span key={badge} className="inline-flex items-center rounded-full bg-brand-primary/5 px-4 py-1.5 text-sm font-semibold text-brand-primary ring-1 ring-inset ring-brand-primary/10">
              {badge}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}

function LockShieldIcon({ className }: { className?: string }) {
  return (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
    </svg>
  )
}

function UserCircleIcon({ className }: { className?: string }) {
  return (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.963-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  )
}

function HospitalIcon({ className }: { className?: string }) {
  return (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0 0 12 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75Z" />
    </svg>
  )
}
