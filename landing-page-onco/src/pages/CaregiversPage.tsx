import { PageShell } from '../components/PageShell'
import { CaregiversSection } from '../components/CaregiversSection'
import { Link } from 'react-router-dom'

export function CaregiversPage() {
  return (
    <PageShell
      size="full"
      title="Círculo de Cuidado"
      description="Apoio psicológico e logístico para quem está ao lado de quem enfrenta o tratamento."
    >
      <div className="space-y-16">
        <section className="prose prose-onco max-w-none">
          <p className="text-xl leading-relaxed text-[#3A3A3C]">
            Sabemos que o câncer não afeta apenas o paciente, mas toda a sua rede de apoio. 
            O Aura Onco foi desenhado para aliviar a ansiedade dos familiares e organizar o cuidado compartilhado.
          </p>
        </section>

        <div className="-mx-4 sm:-mx-6 lg:-mx-8">
          <CaregiversSection />
        </div>

        <section className="grid gap-8 sm:grid-cols-3">
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
            <h3 className="font-bold text-[#1C1C1E]">Sem palpites, apenas fatos</h3>
            <p className="mt-2 text-sm text-[#636366]">Acompanhe os sintomas reais sem precisar perguntar o tempo todo "como você está?".</p>
          </div>
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
            <h3 className="font-bold text-[#1C1C1E]">Segurança nas doses</h3>
            <p className="mt-2 text-sm text-[#636366]">Receba confirmações de que as medicações críticas foram administradas no horário correto.</p>
          </div>
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
            <h3 className="font-bold text-[#1C1C1E]">Prontidão para Agir</h3>
            <p className="mt-2 text-sm text-[#636366]">Alertas de biometria (como febre) permitem uma intervenção rápida junto à equipe médica.</p>
          </div>
        </section>

        <section className="rounded-2xl bg-[#004F63]/5 p-12 text-center ring-1 ring-[#004F63]/10">
          <h2 className="text-3xl font-bold text-[#004F63]">O cuidado começa aqui.</h2>
          <p className="mt-4 text-lg text-[#3A3A3C]">
            Conecte-se à jornada do seu ente querido e transforme a preocupação em ação coordenada.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link
              to="/"
              className="rounded-xl bg-[#004F63] px-8 py-3 font-bold text-white transition hover:bg-[#003A4A]"
            >
              Baixar App Grátis
            </Link>
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
