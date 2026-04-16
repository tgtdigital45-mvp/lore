export function Testimonials() {
  const items = [
    {
      name: 'Maria, 54 anos',
      role: 'Paciente',
      context: 'Câncer de mama | 6 ciclos AC-T',
      quote: 'Antes eu chegava na consulta e não lembrava de nada. Agora mando o dossiê PDF pro meu médico um dia antes. Ele já chega sabendo exatamente como me ajudar.',
    },
    {
      name: 'Roberto, 67 anos',
      role: 'Paciente',
      context: 'Câncer de próstata | Hormonioterapia',
      quote: 'Minha filha configurou pra mim. Os botões são grandes e fáceis. Não esqueço mais nenhum remédio e me sinto seguro sabendo que minha família está acompanhando.',
    },
    {
      name: 'Dra. Ana Luiza',
      role: 'Médica',
      context: 'Oncologista Clínica',
      quote: 'Pacientes que usam o Aura Onco chegam com dados objetivos. Consigo ajustar doses e manejar toxicidades com muito mais precisão e segurança clínica.',
    },
  ]

  return (
    <section className="bg-bg-soft py-24 sm:py-32" aria-labelledby="testimonials-heading">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="testimonials-heading" className="text-base font-semibold leading-7 text-brand-primary uppercase tracking-wide">
            Vozes da Jornada
          </h2>
          <p className="mt-2 text-3xl font-extrabold tracking-tight text-text-primary sm:text-4xl">
            Quem vive o cuidado, <br className="hidden sm:block" />
            <span className="text-brand-primary/80">confia no Aura Onco.</span>
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-8 lg:grid-cols-3">
          {items.map((t) => (
            <div key={t.name} className="flex flex-col justify-between rounded-3xl bg-white p-8 shadow-sm ring-1 ring-black/5 transition-all hover:shadow-xl">
              <div className="flex-1">
                <div className="flex gap-1 text-brand-primary mb-6">
                  {[...Array(5)].map((_, i) => (
                    <StarIcon key={i} className="h-5 w-5 fill-current" />
                  ))}
                </div>
                <blockquote className="text-lg font-medium leading-8 text-text-primary">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
              </div>
              <footer className="mt-8 border-t border-bg-soft pt-6">
                <p className="text-base font-bold text-text-primary">{t.name}</p>
                <p className="text-sm font-medium text-brand-primary">{t.role}</p>
                <p className="text-xs text-text-secondary mt-1">{t.context}</p>
              </footer>
            </div>
          ))}
        </div>
        
        <p className="mt-12 text-center text-[11px] font-medium uppercase tracking-widest text-text-secondary opacity-40">
          Experiências reais variam conforme tratamento e orientação médica.
        </p>
      </div>
    </section>
  )
}

function StarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401z" clipRule="evenodd" />
    </svg>
  )
}
