const items = [
  {
    title: 'Áreas de toque gigantes',
    body: 'Botões de 44x44pt mínimo. Pensado para neuropatia periférica e mãos trêmulas.',
  },
  {
    title: 'Modo escuro',
    body: 'Para dias de fotofobia pós-quimio. Seus olhos agradecem.',
  },
  {
    title: 'Fontes ajustáveis',
    body: 'Respeita as configurações de acessibilidade do seu celular. Aumentou a fonte do sistema? O Onco aumenta junto.',
  },
  {
    title: 'Menos digitação, mais deslizar',
    body: 'Sliders com feedback tátil. Você sente quando seleciona.',
  },
]

export function Accessibility() {
  return (
    <section className="border-b border-black/5 bg-[#F2F2F7] py-16 sm:py-20" aria-labelledby="a11y-heading">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <h2 id="a11y-heading" className="text-center text-2xl font-bold tracking-tight text-[#1C1C1E] sm:text-3xl">
          Projetado para quando você não está 100%
        </h2>
        <ul className="mt-12 grid gap-6 sm:grid-cols-2">
          {items.map((i) => (
            <li key={i.title} className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
              <h3 className="text-lg font-semibold text-[#1C1C1E]">{i.title}</h3>
              <p className="mt-2 text-[#3A3A3C]">{i.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
