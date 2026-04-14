export function FAQ() {
  const faqs = [
    {
      q: 'O aplicativo OncoCare é realmente gratuito?',
      a: 'Sim, 100% gratuito para pacientes e cuidadores. Nosso compromisso é com a democratização do suporte oncológico.',
    },
    {
      q: 'Como meus dados são protegidos?',
      a: 'Utilizamos criptografia de nível bancário e seguimos rigorosamente a LGPD. Seus dados nunca são vendidos. Ponto.',
    },
    {
      q: 'Funciona sem conexão com a internet?',
      a: 'Sim. Você pode registrar sintomas e biometria offline. O OncoCare sincroniza tudo automaticamente assim que detectar uma conexão.',
    },
    {
      q: 'Como meu médico acessa o meu dossiê?',
      a: 'Você gera um Dossiê Clínico em PDF diretamente no app e compartilha via WhatsApp ou E-mail. É seguro, rápido e preciso.',
    },
    {
      q: 'Posso convidar familiares para me ajudar?',
      a: 'Com certeza. O recurso "Círculo de Cuidado" permite conectar cuidadores para monitoramento compartilhado e redução da ansiedade familiar.',
    },
  ]

  return (
    <section id="faq" className="bg-bg-pure py-24 sm:py-32" aria-labelledby="faq-heading">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 id="faq-heading" className="text-base font-semibold leading-7 text-brand-primary uppercase tracking-wide">
            Dúvidas Comuns
          </h2>
          <p className="mt-2 text-3xl font-extrabold tracking-tight text-text-primary sm:text-4xl">
            Perguntas Frequentes
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((item) => (
            <details
              key={item.q}
              className="group rounded-3xl bg-bg-soft/50 p-6 transition-all hover:bg-bg-soft open:bg-white open:shadow-lg open:ring-1 open:ring-black/5"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between font-bold text-text-primary">
                {item.q}
                <span className="ml-4 flex-shrink-0 text-brand-primary transition-transform group-open:rotate-180">
                  <ChevronDownIcon className="h-5 w-5" />
                </span>
              </summary>
              <div className="mt-4 text-base leading-7 text-text-secondary">
                {item.a}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
  )
}
