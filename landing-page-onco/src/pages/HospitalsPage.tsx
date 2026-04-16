import { PageShell } from '../components/PageShell'
import { B2BTeaser } from '../components/B2BTeaser'
import { SecuritySection } from '../components/SecuritySection'
import { Link } from 'react-router-dom'

export function HospitalsPage() {
  return (
    <PageShell
      size="full"
      title="Soluções para Instituições"
      description="Potencialize o cuidado oncológico com dados do mundo real e triagem preditiva alimentada por IA."
    >
      <div className="space-y-16">
        <section className="prose prose-onco max-w-none">
          <p className="text-xl leading-relaxed text-[#3A3A3C]">
            Oferecemos uma plataforma robusta para instituições que buscam excelência clínica. Através do 
            <strong>Vínculo via ID</strong>, sua equipe adiciona pacientes instantaneamente com consentimento digital 
            nativo, eliminando barreiras burocráticas e garantindo monitoramento em tempo real com o Aura Onco.
          </p>
        </section>

        <div className="-mx-4 sm:-mx-6 lg:-mx-8">
          <B2BTeaser />
        </div>

        <div className="rounded-3xl bg-[#F2F2F7]/50 p-8 ring-1 ring-black/5 sm:p-12">
          <SecuritySection />
        </div>

        <section className="rounded-2xl border-2 border-[#004F63]/10 bg-white p-12 text-center shadow-xl">
          <h2 className="text-3xl font-bold text-[#004F63]">Vamos agendar uma conversa?</h2>
          <p className="mt-4 text-lg text-[#3A3A3C]">
            Nossa equipe de especialistas está pronta para mostrar como o Aura Onco pode se integrar ao seu fluxo clínico.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <a
              href="mailto:comercial@oncocare.com.br"
              className="rounded-xl bg-[#004F63] px-8 py-3 font-bold text-white transition hover:bg-[#003A4A]"
            >
              Falar com Comercial
            </a>
            <Link
              to="/"
              className="rounded-xl border border-[#004F63]/20 px-8 py-3 font-bold text-[#004F63] transition hover:bg-[#F2F2F7]"
            >
              Voltar ao Início
            </Link>
          </div>
        </section>
      </div>
    </PageShell>
  )
}
