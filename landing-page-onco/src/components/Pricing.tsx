export function Pricing() {
  return (
    <section className="border-b border-black/5 bg-white py-16 sm:py-20" aria-labelledby="pricing-heading">
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
        <h2 id="pricing-heading" className="text-2xl font-bold tracking-tight text-[#1C1C1E] sm:text-3xl">
          Por que o Onco é gratuito?
        </h2>
        <p className="mt-6 text-lg text-[#3A3A3C]">
          Acreditamos que tecnologia de saúde não deveria ter paywall. O app é e sempre será gratuito para
          pacientes.
        </p>
        <p className="mt-4 text-lg text-[#3A3A3C]">
          Nosso modelo: hospitais e clínicas que desejam acesso ao Dashboard de Triagem pagam uma assinatura
          institucional. Seus dados nunca são vendidos. Ponto.
        </p>
      </div>
    </section>
  )
}
