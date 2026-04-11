const items = [
  {
    name: 'Maria, 54 anos',
    context: 'Câncer de mama, 6 ciclos de AC-T',
    quote:
      'Antes eu chegava na consulta e não lembrava de nada. Agora mando o PDF pro meu onco um dia antes. Ele já chega sabendo como me ajudar.',
  },
  {
    name: 'Roberto, 67 anos',
    context: 'Câncer de próstata, hormonioterapia',
    quote:
      'Minha filha configurou pra mim. Os botões são grandes, eu consigo usar mesmo com a mão tremendo. Não esqueço mais nenhum remédio.',
  },
  {
    name: 'Dra. Ana Luiza',
    context: 'Oncologista clínica, Hospital Sírio-Libanês',
    quote:
      'Pacientes que usam o Onco chegam com dados objetivos. Consigo ajustar doses e manejar efeitos colaterais com muito mais precisão.',
  },
]

export function Testimonials() {
  return (
    <section className="border-b border-black/5 bg-white py-16 sm:py-20" aria-labelledby="testimonials-heading">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <h2 id="testimonials-heading" className="text-center text-2xl font-bold tracking-tight text-[#1C1C1E] sm:text-3xl">
          Quem usa, recomenda
        </h2>
        <ul className="mt-12 grid gap-6 lg:grid-cols-3">
          {items.map((t) => (
            <li
              key={t.name}
              className="flex flex-col rounded-2xl bg-[#F2F2F7] p-6 ring-1 ring-black/5"
            >
              <blockquote className="flex-1 text-[#3A3A3C]">&ldquo;{t.quote}&rdquo;</blockquote>
              <footer className="mt-6 border-t border-black/5 pt-4">
                <p className="font-semibold text-[#1C1C1E]">{t.name}</p>
                <p className="text-sm text-[#636366]">{t.context}</p>
              </footer>
            </li>
          ))}
        </ul>
        <p className="mt-10 border-t border-black/5 pt-4 text-center text-[11px] leading-snug text-[#AEAEB2]">
          Cenários ilustrativos de uso. Experiências reais variam conforme tratamento e orientação médica.
        </p>
      </div>
    </section>
  )
}
