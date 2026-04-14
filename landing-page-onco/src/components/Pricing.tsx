export function Pricing() {
  return (
    <section className="bg-bg-pure py-24 sm:py-32" aria-labelledby="pricing-heading">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[3rem] bg-bg-soft px-8 py-20 text-center shadow-inner sm:px-16 sm:py-24">
          <div className="mx-auto max-w-2xl">
            <h2 id="pricing-heading" className="text-base font-semibold leading-7 text-brand-primary uppercase tracking-wide">
              Transparência e Ética
            </h2>
            <p className="mt-2 text-3xl font-extrabold tracking-tight text-text-primary sm:text-4xl">
              Gratuito para pacientes. <br className="hidden sm:block" />
              <span className="text-brand-primary/80">Sustentável para instituições.</span>
            </p>
            <p className="mt-6 text-lg leading-8 text-text-secondary">
              Acreditamos que a tecnologia de suporte oncológico deve ser acessível a todos. 
              Por isso, o aplicativo OncoCare é e sempre será gratuito para pacientes e cuidadores.
            </p>
            
            <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2 text-left">
              <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-black/5">
                <p className="text-sm font-bold text-brand-primary uppercase tracking-widest">B2C</p>
                <h3 className="mt-2 text-xl font-bold text-text-primary">Para Pacientes</h3>
                <p className="mt-2 text-sm text-text-secondary">Acesso completo ao app, dossiês ilimitados e conexão com cuidadores. Zero custo.</p>
              </div>
              <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-black/5">
                <p className="text-sm font-bold text-brand-primary uppercase tracking-widest">B2B</p>
                <h3 className="mt-2 text-xl font-bold text-text-primary">Para Instituições</h3>
                <p className="mt-2 text-sm text-text-secondary">Assinatura institucional para Dashboards de Triagem e RWD. Entre em contato para orçamentos.</p>
              </div>
            </div>
            
            <p className="mt-10 text-xs font-medium text-text-secondary opacity-60">
              Seus dados nunca são vendidos. Cumprimos rigorosamente a LGPD.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
