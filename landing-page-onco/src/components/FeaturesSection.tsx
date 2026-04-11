import type { FC } from 'react'

type Feature = {
  title: string
  desc: string
  detail: string | null
  icon: FC<{ className?: string }>
  quote?: string
}

const features: Feature[] = [
  {
    title: 'Registre como você está em 10 segundos',
    desc:
      'Sliders táteis para dor, náusea e fadiga. Sem digitar. Só deslizar, salvar e seguir seu dia. Áreas de toque grandes pensadas para neuropatia periférica.',
    detail: 'Escalas baseadas no FACES Pain Scale adaptado',
    icon: SliderIcon,
  },
  {
    title: "Nunca mais 'será que tomei?'",
    desc:
      "Notificações no horário exato. Botão gigante de 'Tomado' que você consegue apertar até de olhos fechados. Histórico completo de doses.",
    detail: 'Compatível com regimes complexos: de 8 em 8h, dias alternados, conforme necessário',
    icon: PillIcon,
  },
  {
    title: 'Saiba exatamente onde você está',
    desc:
      'Veja seu ciclo de quimio, radio ou imuno de forma visual. Quantas sessões faltam. Quando é a próxima consulta. Tudo em um calendário limpo.',
    detail: null,
    icon: CalendarIcon,
  },
  {
    title: 'Fotografe, organize, encontre',
    desc:
      'Tire foto do resultado de exame. A IA extrai os valores automaticamente. Acompanhe tendências de hemoglobina, leucócitos e mais.',
    detail: null,
    icon: DocIcon,
  },
  {
    title: 'Consultas mais produtivas',
    desc:
      'Gere um PDF com seus últimos 7, 15 ou 30 dias. Gráficos de tendência de sintomas + adesão medicamentosa. Envie por WhatsApp antes da consulta.',
    quote: 'Meu oncologista disse que nunca teve um paciente tão bem documentado.',
    detail: null,
    icon: PdfIcon,
  },
  {
    title: 'Seus dados de saúde conectados',
    desc:
      'Frequência cardíaca, saturação de oxigênio, passos. Se você já usa Apple Watch ou outros wearables, o Onco puxa os dados automaticamente.',
    detail: null,
    icon: HeartIcon,
  },
]

export function FeaturesSection() {
  return (
    <section className="border-b border-black/5 bg-white py-16 sm:py-20" aria-labelledby="features-heading">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 id="features-heading" className="text-2xl font-bold tracking-tight text-[#1C1C1E] sm:text-3xl">
            Onco: seu companheiro silencioso e eficiente
          </h2>
          <p className="mt-4 text-lg text-[#3A3A3C]">
            Projetado com oncologistas e pacientes. Cada tela pensada para o mínimo de esforço, o máximo de
            informação.
          </p>
        </div>
        <ul className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <li
              key={f.title}
              className="flex flex-col rounded-2xl border border-[#E5E5EA] bg-[#F2F2F7] p-6 transition hover:border-[#007AFF]/30"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#007AFF]/10 text-[#007AFF]">
                <f.icon className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold text-[#1C1C1E]">{f.title}</h3>
              <p className="mt-2 flex-1 text-[#3A3A3C]">{f.desc}</p>
              {f.quote ? (
                <blockquote className="mt-4 border-l-4 border-[#34C759] pl-4 text-sm italic text-[#636366]">
                  &ldquo;{f.quote}&rdquo;
                </blockquote>
              ) : null}
              {f.detail ? <p className="mt-3 text-sm font-medium text-[#007AFF]">{f.detail}</p> : null}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function SliderIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path strokeLinecap="round" d="M4 12h16" />
      <circle cx="9" cy="12" r="3" fill="currentColor" stroke="none" />
    </svg>
  )
}

function PillIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="4" y="8" width="16" height="8" rx="4" />
      <path strokeLinecap="round" d="M12 8v8" />
    </svg>
  )
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M3 10h18M8 2v4M16 2v4" strokeLinecap="round" />
    </svg>
  )
}

function DocIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" strokeLinecap="round" />
    </svg>
  )
}

function PdfIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M9 15h6M9 11h3" strokeLinecap="round" />
    </svg>
  )
}

function HeartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
}
