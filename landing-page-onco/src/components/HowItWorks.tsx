import { MockupDiary, MockupPdf, MockupProfile } from './HowItWorksMockups'

const steps = [
  {
    n: '1',
    title: 'Cadastre seu perfil clínico',
    desc: 'Tipo de câncer, estágio, medicamentos atuais. Uma vez só, em 2 minutos.',
    Mock: MockupProfile,
  },
  {
    n: '2',
    title: 'Registre diariamente (em segundos)',
    desc: 'Abra o app. Deslize os sliders. Salve. Pronto.',
    Mock: MockupDiary,
  },
  {
    n: '3',
    title: 'Compartilhe na consulta',
    desc: 'Exporte o PDF, envie ao médico. Decisões de tratamento baseadas em dados reais, não em memória falha.',
    Mock: MockupPdf,
  },
] as const

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="border-b border-black/5 bg-[#F2F2F7] py-16 sm:py-20"
      aria-labelledby="how-heading"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <h2 id="how-heading" className="text-center text-2xl font-bold tracking-tight text-[#1C1C1E] sm:text-3xl">
          3 passos para retomar o controle
        </h2>
        <ol className="mt-14 grid gap-10 lg:grid-cols-3">
          {steps.map((s) => (
            <li key={s.n} className="flex flex-col items-center text-center">
              <div
                className="flex h-14 w-14 items-center justify-center rounded-full bg-[#007AFF] text-xl font-bold text-white shadow-lg shadow-[#007AFF]/25"
                aria-hidden
              >
                {s.n}
              </div>
              <div
                className="mt-6 flex min-h-[11rem] w-full max-w-[240px] items-center justify-center rounded-[2rem] bg-white px-2 shadow-inner ring-1 ring-black/5"
                aria-hidden
              >
                <s.Mock />
              </div>
              <h3 className="mt-6 text-lg font-semibold text-[#1C1C1E]">{s.title}</h3>
              <p className="mt-2 max-w-sm text-[#3A3A3C]">{s.desc}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
