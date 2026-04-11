const badges = ['LGPD Compliant', 'Criptografia AES-256', 'TLS 1.3', 'Dados armazenados no Brasil']

const cards = [
  {
    title: 'Criptografia em trânsito e em repouso',
    body:
      'Seus sintomas e medicamentos são protegidos com criptografia em trânsito (TLS) e boas práticas de armazenamento. Acesso restrito por políticas de segurança.',
  },
  {
    title: 'Você controla seus dados',
    body: 'Exporte tudo a qualquer momento. Delete sua conta e seus registros conforme o direito ao esquecimento (Art. 18 LGPD).',
  },
  {
    title: 'Acesso hospitalar só com sua permissão',
    body: 'Se seu hospital usar o painel Onco, você aprova ou revoga o acesso a qualquer momento.',
  },
]

export function SecuritySection() {
  return (
    <section className="border-b border-black/5 bg-white py-16 sm:py-20" aria-labelledby="security-heading">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 id="security-heading" className="text-2xl font-bold tracking-tight text-[#1C1C1E] sm:text-3xl">
            Seus dados de saúde merecem proteção de banco
          </h2>
          <p className="mt-4 text-lg text-[#3A3A3C]">
            Construído com segurança de nível hospitalar desde o primeiro dia.
          </p>
        </div>
        <ul className="mt-8 flex flex-wrap justify-center gap-2" aria-label="Selos de segurança">
          {badges.map((b) => (
            <li
              key={b}
              className="rounded-full bg-[#F2F2F7] px-4 py-1.5 text-sm font-medium text-[#3A3A3C] ring-1 ring-black/5"
            >
              {b}
            </li>
          ))}
        </ul>
        <ul className="mt-12 grid gap-6 lg:grid-cols-3">
          {cards.map((c) => (
            <li key={c.title} className="rounded-2xl border border-[#E5E5EA] bg-[#F2F2F7] p-6">
              <h3 className="text-lg font-semibold text-[#1C1C1E]">{c.title}</h3>
              <p className="mt-3 text-[#3A3A3C]">{c.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
