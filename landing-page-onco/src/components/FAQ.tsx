const faqs = [
  {
    q: 'O app é realmente gratuito?',
    a: 'Sim, 100% gratuito para pacientes. Sem anúncios, sem compras no app, sem pegadinhas.',
  },
  {
    q: 'Meus dados são vendidos?',
    a: 'Jamais. Seus dados de saúde são protegidos e só você decide quem pode ver. Nosso modelo de negócio é B2B (hospitais), não venda de dados.',
  },
  {
    q: 'Funciona offline?',
    a: 'Você pode registrar sintomas e medicamentos offline. Quando voltar a ter internet, tudo sincroniza automaticamente.',
  },
  {
    q: 'Preciso ter câncer para usar?',
    a: 'O Onco foi projetado para pacientes oncológicos, mas qualquer pessoa em tratamento crônico pode se beneficiar do diário de sintomas e gestão medicamentosa.',
  },
  {
    q: 'Como meu médico pode acessar meus dados?',
    a: 'Você gera um PDF e envia por WhatsApp ou e-mail. Se seu hospital tiver o painel Onco, você pode autorizar o acesso (e revogar a qualquer momento).',
  },
  {
    q: 'E se eu quiser deletar minha conta?',
    a: 'Vá em Configurações → Excluir conta. Seus dados serão tratados conforme a LGPD e as políticas do aplicativo.',
  },
]

export function FAQ() {
  return (
    <section className="border-b border-black/5 bg-[#F2F2F7] py-16 sm:py-20" aria-labelledby="faq-heading">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h2 id="faq-heading" className="text-center text-2xl font-bold tracking-tight text-[#1C1C1E] sm:text-3xl">
          Perguntas frequentes
        </h2>
        <div className="mt-10 space-y-3">
          {faqs.map((item) => (
            <details
              key={item.q}
              className="group rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 open:ring-[#007AFF]/20"
            >
              <summary className="cursor-pointer list-none font-semibold text-[#1C1C1E] marker:content-none [&::-webkit-details-marker]:hidden">
                <span className="flex items-center justify-between gap-4">
                  {item.q}
                  <span className="text-[#007AFF] transition group-open:rotate-180" aria-hidden>
                    ▼
                  </span>
                </span>
              </summary>
              <p className="mt-3 text-[#3A3A3C]">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
