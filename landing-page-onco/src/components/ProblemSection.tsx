const cards = [
  {
    title: 'Tomei o remédio ou não tomei?',
    body:
      "A quimioterapia afeta a memória. O 'chemo brain' faz você duvidar se tomou a dose das 8h. E aí, toma de novo? Pula?",
  },
  {
    title: 'Como eu estava na semana passada?',
    body:
      'O oncologista pergunta sobre seus sintomas. Você tenta lembrar. "Acho que terça foi ruim... ou foi quarta?" Relatos imprecisos prejudicam o ajuste do tratamento.',
  },
  {
    title: 'Papéis, exames, horários por todo lado',
    body:
      'Resultados de hemograma em um app, lembretes no outro, anotações no papel. A informação fragmentada consome energia que você não tem.',
  },
]

export function ProblemSection() {
  return (
    <section className="border-b border-black/5 bg-[#F2F2F7] py-16 sm:py-20" aria-labelledby="problem-heading">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <h2
          id="problem-heading"
          className="mx-auto max-w-3xl text-balance text-center text-2xl font-bold tracking-tight text-[#1C1C1E] sm:text-3xl"
        >
          O tratamento já é difícil. A organização não precisa ser.
        </h2>
        <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => (
            <li
              key={c.title}
              className="rounded-2xl bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)] ring-1 ring-black/5"
            >
              <h3 className="text-lg font-semibold text-[#1C1C1E]">{c.title}</h3>
              <p className="mt-3 text-[#3A3A3C]">{c.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
