import { Link } from 'react-router-dom'
import { PageShell } from '../components/PageShell'

export function AboutPage() {
  return (
    <PageShell
      title="Sobre o Onco"
      description="Um aplicativo pensado para quem vive o tratamento oncológico no dia a dia — com dignidade, clareza e menos carga mental."
    >
      <section className="rounded-2xl bg-white p-6 ring-1 ring-black/5">
        <h2 className="text-xl font-semibold text-[#1C1C1E]">Por que existimos</h2>
        <p className="mt-3">
          O Onco nasceu da constatação de que viver um tratamento de câncer não é só &ldquo;ir à quimio&rdquo;: é
          remédios em horários diferentes, sintomas que mudam a cada dia, exames espalhados e consultas em que é
          difícil explicar como você se sentiu na semana passada. A fadiga e o chamado <em>chemo brain</em> tornam a
          memória frágil — e relatos imprecisos atrapalham o oncologista a ajustar dose, sintomas e suporte.
        </p>
      </section>

      <section className="rounded-2xl bg-white p-6 ring-1 ring-black/5">
        <h2 className="text-xl font-semibold text-[#1C1C1E]">Nossa missão</h2>
        <p className="mt-3">
          Reduzir a <strong>carga mental e física</strong> do tratamento oncológico, capacitando pacientes a
          retomarem o controle da rotina com registros rápidos (em poucos segundos) e dados que viram relatórios
          objetivos para a equipe médica. <strong>Um dia de cada vez.</strong>
        </p>
      </section>

      <section className="rounded-2xl bg-white p-6 ring-1 ring-black/5">
        <h2 className="text-xl font-semibold text-[#1C1C1E]">O que o aplicativo faz</h2>
        <ul className="mt-3 list-inside list-disc space-y-2">
          <li>Diário de sintomas com escalas simples (dor, náusea, fadiga, humor)</li>
          <li>Lembretes e registro de medicação, com histórico de doses</li>
          <li>Acompanhamento de ciclos de tratamento e agenda em calendário</li>
          <li>Organização de exames e tendências de biomarcadores, com apoio de leitura assistida</li>
          <li>Relatórios em PDF para levar ou enviar antes da consulta</li>
          <li>Privacidade e consentimento (LGPD), com gestão de vínculos com hospitais quando você autorizar</li>
        </ul>
      </section>

      <section className="rounded-2xl bg-white p-6 ring-1 ring-black/5">
        <h2 className="text-xl font-semibold text-[#1C1C1E]">Visão: saúde conectada com responsabilidade</h2>
        <p className="mt-3">
          Queremos que dados do mundo real — sempre com <strong>consentimento</strong> — apoiem decisões clínicas e
          navegação oncológica. O <strong>dashboard para instituições de saúde</strong> (quando adotado pelo seu
          hospital) permite triagem e continuidade do cuidado, com regras de acesso e auditoria; o paciente permanece
          no centro e pode aprovar ou revogar vínculos no aplicativo.
        </p>
      </section>

      <section className="rounded-2xl bg-white p-6 ring-1 ring-black/5">
        <h2 className="text-xl font-semibold text-[#1C1C1E]">Valores</h2>
        <ul className="mt-3 list-inside list-disc space-y-2">
          <li>
            <strong>Gratuidade para pacientes</strong> — o app para quem está em tratamento não deve ser barreira
            financeira.
          </li>
          <li>
            <strong>Privacidade por desenho</strong> — segurança e transparência no tratamento de dados de saúde.
          </li>
          <li>
            <strong>Acessibilidade</strong> — interfaces pensadas para mãos trêmulas, fadiga visual e pouca energia
            cognitiva.
          </li>
          <li>
            <strong>Honestidade clínica</strong> — o Onco complementa o cuidado; não substitui seu médico ou
            emergência.
          </li>
        </ul>
      </section>

      <section className="rounded-2xl bg-white p-6 ring-1 ring-black/5">
        <h2 className="text-xl font-semibold text-[#1C1C1E]">Quem constrói</h2>
        <p className="mt-3">
          Um time multidisciplinar de <strong>produto, engenharia e experiência em saúde digital</strong>, alinhado ao
          que já está implementado no ecossistema Aura Onco (aplicativo, integrações e políticas de segurança). Os
          canais oficiais de contato e encarregado de dados constam na{' '}
          <Link to="/privacidade" className="font-semibold text-[#007AFF] underline-offset-2 hover:underline">
            Política de privacidade
          </Link>{' '}
          e na página{' '}
          <Link to="/contato" className="font-semibold text-[#007AFF] underline-offset-2 hover:underline">
            Contato
          </Link>
          .
        </p>
      </section>

      <p className="text-center">
        <Link
          to="/contato"
          className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#007AFF] px-6 py-3 font-semibold text-white transition hover:bg-[#0066DD] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007AFF]"
        >
          Fale conosco
        </Link>
      </p>
    </PageShell>
  )
}
