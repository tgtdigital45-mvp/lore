import { PageShell } from '../components/PageShell'
import { FeaturesSection } from '../components/FeaturesSection'
import { Accessibility } from '../components/Accessibility'
import { Link } from 'react-router-dom'

export function FeaturesPage() {
  return (
    <PageShell
      size="full"
      title="Funcionalidades de Elite"
      description="Tecnologia avançada projetada para simplificar a jornada oncológica e reduzir o peso do tratamento."
    >
      <div className="space-y-16">
        <section className="prose prose-onco max-w-none">
          <p className="text-xl leading-relaxed text-[#3A3A3C]">
            O Aura Onco não é apenas um diário. É um ecossistema de inteligência clínica que transforma dados subjetivos 
            em informações acionáveis. Através de um <strong>Código ID único e seguro</strong>, você escolhe com quem 
            compartilhar sua jornada, mantendo soberania total sobre seus dados.
          </p>
        </section>

        <div className="-mx-4 sm:-mx-6 lg:-mx-8">
          <FeaturesSection />
        </div>

        <div className="rounded-3xl bg-[#F2F2F7]/50 p-8 ring-1 ring-black/5 sm:p-12">
          <Accessibility />
        </div>

        <section className="rounded-2xl bg-[#004F63] p-12 text-center text-white shadow-2xl">
          <h2 className="text-3xl font-bold">Pronto para começar?</h2>
          <p className="mt-4 text-lg text-white/80">
            Baixe o Aura Onco agora e tenha o controle total do seu tratamento na palma da mão.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link
              to="/"
              className="rounded-xl bg-white px-8 py-3 font-bold text-[#004F63] transition hover:bg-white/90"
            >
              Voltar ao Início
            </Link>
          </div>
        </section>
      </div>
    </PageShell>
  )
}
