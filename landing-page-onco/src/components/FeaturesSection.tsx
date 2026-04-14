import type { FC } from 'react'

type Feature = {
  title: string
  desc: string
  detail: string | null
  icon: FC<{ className?: string }>
  color: string
}

const features: Feature[] = [
  {
    title: 'Registro Táteis em 10s',
    desc:
      'Sliders intuitivos para dor, náuseas e fadiga. Projetados para neuropatia periférica, sem necessidade de digitação complexa.',
    detail: 'Escala FACES adaptada',
    icon: SliderIcon,
    color: 'clinical-symptoms',
  },
  {
    title: 'IA: Tradutor de Exames',
    desc:
      'Fotografe seus laudos e deixe nossa IA explicar os resultados em linguagem simples, rastreando biomarcadores críticos automaticamente.',
    detail: 'OCR Clínico Integrado',
    icon: DocIcon,
    color: 'clinical-respiratory',
  },
  {
    title: 'Gestão Inteligente de Doses',
    desc:
      'Lembretes adaptativos que garantem 100% de adesão. Botão de confirmação massivo para uso simplificado no auge da fadiga.',
    detail: 'Apoio ao Nadir Imunológico',
    icon: PillIcon,
    color: 'clinical-treatment',
  },
  {
    title: 'Relatório Dossiê Médico',
    desc:
      'Gere PDFs consolidados para sua consulta. Gráficos de toxicidade e vitalidade que ajudam seu médico a tomar decisões melhores.',
    detail: 'Exportação em 1 toque',
    icon: PdfIcon,
    color: 'brand-primary',
  },
  {
    title: 'Ecossistema Wearable',
    desc:
      'Sincronização passiva com Apple Watch e HealthKit. Monitoramos VFC, SpO2 e passos sem que você precise abrir o app.',
    detail: 'Monitoramento 24/7',
    icon: HeartIcon,
    color: 'clinical-vitals',
  },
  {
    title: 'Círculo de Cuidado',
    desc:
      'Compartilhe seu status em tempo real com familiares e cuidadores. Logística de medicamentos e alertas de emergência integrados.',
    detail: 'Modo Cuidador Ativo',
    icon: UsersIcon,
    color: 'clinical-nutrition',
  },
  {
    title: 'Vínculo Seguro via ID',
    desc:
      'Compartilhe seu código único com o hospital para monitoramento em tempo real. Você mantém o controle total e pode revogar o acesso a qualquer momento.',
    detail: 'LGPD Ready · Zero Setup',
    icon: CodeIcon,
    color: 'brand-primary',
  },
]

export function FeaturesSection() {
  return (
    <section className="bg-bg-pure py-24 sm:py-32" aria-labelledby="features-heading">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:text-center">
          <h2 className="text-base font-semibold leading-7 text-brand-primary uppercase tracking-wide">
            Funcionalidades de Elite
          </h2>
          <p id="features-heading" className="mt-2 text-3xl font-extrabold tracking-tight text-text-primary sm:text-4xl">
            Tudo o que você precisa para focar <br className="hidden sm:block" />
            <span className="text-brand-primary/80">apenas na sua recuperação.</span>
          </p>
        </div>
        
        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
          <ul className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-12 lg:max-w-none lg:grid-cols-3">
            {features.map((f) => (
              <li key={f.title} className="relative flex flex-col items-start rounded-3xl border border-bg-soft bg-bg-soft/50 p-8 transition-all hover:bg-white hover:shadow-2xl hover:shadow-brand-primary/5">
                <div className={`mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-black/5`}>
                  <f.icon className={`h-6 w-6 text-${f.color}`} aria-hidden="true" />
                </div>
                <h3 className="text-lg font-bold leading-7 text-text-primary">
                  {f.title}
                </h3>
                <p className="mt-2 flex-1 text-base leading-7 text-text-secondary">
                  {f.desc}
                </p>
                {f.detail && (
                  <div className="mt-4 inline-flex items-center rounded-lg bg-white px-2 py-1 text-xs font-medium text-brand-primary ring-1 ring-inset ring-brand-primary/10">
                    {f.detail}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
    </svg>
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

function CodeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M8 10l-2 2 2 2M16 10l2 2-2 2M12 8l-2 8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
