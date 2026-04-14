import { Link } from 'react-router-dom'
import { PageShell } from '../components/PageShell'

export function AboutPage() {
  return (
    <PageShell
      size="full"
      title="Nossa História e Missão"
      description="Um ecossistema pensado por quem vive o tratamento oncológico no dia a dia — com dignidade, clareza e menos carga mental."
    >
      <div className="space-y-12">
        <section className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-black/5 sm:p-10">
          <div className="lg:grid lg:grid-cols-2 lg:gap-12 lg:items-center">
            <div>
              <h2 className="text-2xl font-bold text-[#1C1C1E]">Por que existimos</h2>
              <p className="mt-4 text-lg leading-relaxed text-[#3A3A3C]">
                O OncoCare nasceu de uma constatação dolorosa: viver um tratamento de câncer não é apenas "ir à quimioterapia". 
                É lidar com uma cascata de remédios, sintomas voláteis e uma sobrecarga cognitiva brutal.
              </p>
              <p className="mt-4 text-lg leading-relaxed text-[#3A3A3C]">
                A fadiga e o <em>chemo brain</em> tornam a memória frágil, e relatos imprecisos durante as consultas dificultam o ajuste clínico ideal. 
                Existimos para eliminar essa lacuna.
              </p>
            </div>
            <div className="mt-10 lg:mt-0">
              <div className="aspect-[4/3] rounded-2xl bg-[#004F63]/5 flex items-center justify-center p-8">
                <blockquote className="text-center italic text-[#004F63]">
                  "Um dia de cada vez não é apenas um lema, é a unidade de medida do cuidado oncológico."
                </blockquote>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-8 md:grid-cols-2">
          <div className="rounded-3xl bg-[#004F63] p-8 text-white shadow-xl">
            <h2 className="text-xl font-bold">Nossa Visão</h2>
            <p className="mt-4 text-white/80">
              Queremos que cada paciente oncológico tenha sua voz estruturada em dados, permitindo que a medicina personalizada 
              chegue ao nível do dia a dia, não apenas no diagnóstico.
            </p>
          </div>
          <div className="rounded-3xl bg-[#F2F2F7] p-8 ring-1 ring-black/5">
            <h2 className="text-xl font-bold text-[#1C1C1E]">Valores Inegociáveis</h2>
            <ul className="mt-4 space-y-3 text-[#3A3A3C]">
              <li className="flex gap-3">
                <span className="text-[#004F63] font-bold">✓</span>
                <span><strong>Gratuidade</strong> para quem está em tratamento.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-[#004F63] font-bold">✓</span>
                <span><strong>Privacidade</strong> por desenho (Privacy by Design).</span>
              </li>
              <li className="flex gap-3">
                <span className="text-[#004F63] font-bold">✓</span>
                <span><strong>Acessibilidade</strong> cognitiva e motora.</span>
              </li>
            </ul>
          </div>
        </section>

        <section className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-black/5">
          <h2 className="text-2xl font-bold text-[#1C1C1E]">Um Ecossistema Conectado</h2>
          <p className="mt-4 text-lg leading-relaxed text-[#3A3A3C]">
            O OncoCare não é um aplicativo isolado. Ele é o elo entre o paciente, sua rede de apoio e as instituições de saúde. 
            Utilizamos Real World Data (RWD) para gerar insights que salvam vidas e otimizam recursos hospitalares, 
            sempre com o consentimento explícito e soberano do paciente.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link to="/funcionalidades" className="text-[#007AFF] font-bold hover:underline">Ver Funcionalidades →</Link>
            <Link to="/hospitais" className="text-[#007AFF] font-bold hover:underline">Soluções Corporativas →</Link>
            <Link to="/cuidadores" className="text-[#007AFF] font-bold hover:underline">Apoio a Familiares →</Link>
          </div>
        </section>

        <div className="text-center pt-8">
          <p className="text-[#8E8E93]">© {new Date().getFullYear()} OncoCare. Todos os direitos reservados.</p>
        </div>
      </div>
    </PageShell>
  )
}

