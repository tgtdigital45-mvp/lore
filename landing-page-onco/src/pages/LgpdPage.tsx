import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { PageShell } from '../components/PageShell'
import { DPO_EMAIL } from '../lib/companyLegal'

const REQUEST_TYPES = [
  'Confirmação da existência de tratamento',
  'Acesso aos dados',
  'Correção de dados incompletos, inexatos ou desatualizados',
  'Anonimização, bloqueio ou eliminação',
  'Portabilidade dos dados',
  'Eliminação de dados tratados com consentimento',
  'Informação sobre compartilhamento',
  'Informação sobre possibilidade de não fornecer consentimento',
  'Revogação do consentimento',
  'Outro (descreva na mensagem)',
] as const

const VIGENCY = '11 de abril de 2026'

export function LgpdPage() {
  const [requestType, setRequestType] = useState<(typeof REQUEST_TYPES)[number]>(REQUEST_TYPES[0])
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [cpf, setCpf] = useState('')
  const [message, setMessage] = useState('')

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const subject = encodeURIComponent(`[LGPD] ${requestType}`)
    const body = encodeURIComponent(
      `Tipo de solicitação: ${requestType}\n\nNome: ${name}\nE-mail para resposta: ${email}\nCPF (opcional, para conferência de titularidade): ${cpf}\n\nDescrição:\n${message}\n\n---\nEnvie esta mensagem após revisar os dados. Prazos de resposta seguem a regulamentação da ANPD e a política interna do controlador.`,
    )
    window.location.href = `mailto:${DPO_EMAIL}?subject=${subject}&body=${body}`
  }

  return (
    <PageShell
      size="full"
      title="LGPD — direitos do titular"
      description="Lei nº 13.709/2018 (LGPD): como exercer seus direitos em relação aos dados tratados pelo Onco e pelos serviços associados."
      lastUpdated={VIGENCY}
    >
      <p className="rounded-xl bg-[#F2F2F7] p-4 text-sm text-[#636366]">
        Texto de apoio ao titular. A validade jurídica final depende de alinhamento com o ROPA, contratos e revisão do{' '}
        <strong>DPO/advogado</strong>. Substitua o e-mail do DPO pelo canal oficial.
      </p>

      <p>
        Esta página complementa a{' '}
        <Link to="/privacidade" className="font-semibold text-[#007AFF] underline-offset-2 hover:underline">
          Política de privacidade
        </Link>
        . Em caso de dúvida sobre o tratamento, consulte primeiro a política e o{' '}
        <Link to="/termos" className="font-semibold text-[#007AFF] underline-offset-2 hover:underline">
          Termos de uso
        </Link>
        .
      </p>

      <section>
        <h2 className="text-xl font-semibold text-[#1C1C1E]">Direitos previstos no Art. 18 da LGPD</h2>
        <p className="mt-3">O titular dos dados pessoais tem direito a obter do controlador, em relação aos dados por ele tratados:</p>
        <ol className="mt-3 list-inside list-decimal space-y-3">
          <li>
            <strong>I — Confirmação da existência de tratamento;</strong>
          </li>
          <li>
            <strong>II — Acesso aos dados;</strong>
          </li>
          <li>
            <strong>III — Correção de dados incompletos, inexatos ou desatualizados;</strong>
          </li>
          <li>
            <strong>IV — Anonimização, bloqueio ou eliminação</strong> de dados desnecessários, excessivos ou tratados em
            desconformidade com a LGPD;
          </li>
          <li>
            <strong>V — Portabilidade</strong> dos dados a outro fornecedor de serviço ou produto, observados segredos
            comercial e industrial;
          </li>
          <li>
            <strong>VI — Eliminação</strong> dos dados pessoais tratados com o consentimento, exceto nas hipóteses previstas
            em lei;
          </li>
          <li>
            <strong>VII — Informação</strong> sobre entidades públicas e privadas com as quais o controlador realizou uso
            compartilhado de dados;
          </li>
          <li>
            <strong>VIII — Informação sobre a possibilidade de não fornecer consentimento</strong> e sobre as consequências
            da negativa;
          </li>
          <li>
            <strong>IX — Revogação do consentimento</strong>, nos termos do §5º do art. 8º da LGPD.
          </li>
        </ol>
        <p className="mt-3 text-sm text-[#636366]">
          Dados anonimizados não são considerados dados pessoais, salvo quando o processo de anonimização for revertido
          ou quando permitir identificação indireta do titular (definições legais aplicáveis).
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-[#1C1C1E]">Como exercer os direitos</h2>
        <p className="mt-3">
          Você pode utilizar o <strong>formulário abaixo</strong>, que abrirá seu cliente de e-mail com a mensagem
          preenchida para o encarregado em{' '}
          <a href={`mailto:${DPO_EMAIL}`} className="font-semibold text-[#007AFF] underline-offset-2 hover:underline">
            {DPO_EMAIL}
          </a>
          . Também é possível enviar pedido por escrito com documentação que permita verificar sua identidade, quando
          necessário à segurança e à lei.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-[#1C1C1E]">Prazos</h2>
        <p className="mt-3">
          O controlador deve responder às solicitações do titular nos prazos e condições definidos na legislação e na
          regulamentação da ANPD. Em alguns casos poderá ser solicitada informação adicional para evitar fraudes.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-[#1C1C1E]">Formulário de solicitação</h2>
        <form onSubmit={onSubmit} className="mt-4 space-y-4 rounded-2xl bg-white p-6 ring-1 ring-black/5">
          <div>
            <label htmlFor="lgpd-type" className="block text-sm font-medium text-[#1C1C1E]">
              Tipo de solicitação
            </label>
            <select
              id="lgpd-type"
              value={requestType}
              onChange={(ev) => setRequestType(ev.target.value as (typeof REQUEST_TYPES)[number])}
              className="mt-1 w-full min-h-[44px] rounded-xl border border-[#E5E5EA] bg-[#F2F2F7] px-3 py-2 text-[#1C1C1E] outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/25"
            >
              {REQUEST_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="lgpd-name" className="block text-sm font-medium text-[#1C1C1E]">
              Nome completo
            </label>
            <input
              id="lgpd-name"
              type="text"
              autoComplete="name"
              required
              value={name}
              onChange={(ev) => setName(ev.target.value)}
              className="mt-1 w-full min-h-[44px] rounded-xl border border-[#E5E5EA] bg-[#F2F2F7] px-3 py-2 text-[#1C1C1E] outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/25"
            />
          </div>
          <div>
            <label htmlFor="lgpd-email" className="block text-sm font-medium text-[#1C1C1E]">
              E-mail para resposta
            </label>
            <input
              id="lgpd-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              className="mt-1 w-full min-h-[44px] rounded-xl border border-[#E5E5EA] bg-[#F2F2F7] px-3 py-2 text-[#1C1C1E] outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/25"
            />
          </div>
          <div>
            <label htmlFor="lgpd-cpf" className="block text-sm font-medium text-[#1C1C1E]">
              CPF (opcional)
            </label>
            <input
              id="lgpd-cpf"
              type="text"
              autoComplete="off"
              placeholder="Somente se desejar facilitar a conferência de titularidade"
              value={cpf}
              onChange={(ev) => setCpf(ev.target.value)}
              className="mt-1 w-full min-h-[44px] rounded-xl border border-[#E5E5EA] bg-[#F2F2F7] px-3 py-2 text-[#1C1C1E] outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/25"
            />
          </div>
          <div>
            <label htmlFor="lgpd-msg" className="block text-sm font-medium text-[#1C1C1E]">
              Descrição do pedido
            </label>
            <textarea
              id="lgpd-msg"
              required
              rows={5}
              value={message}
              onChange={(ev) => setMessage(ev.target.value)}
              placeholder="Inclua período, telas ou dados que deseja acessar ou corrigir, se souber."
              className="mt-1 w-full resize-y rounded-xl border border-[#E5E5EA] bg-[#F2F2F7] px-3 py-2 text-[#1C1C1E] outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/25"
            />
          </div>
          <button
            type="submit"
            className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl bg-[#007AFF] px-6 py-3 font-semibold text-white transition hover:bg-[#0066DD] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007AFF] sm:w-auto"
          >
            Enviar e-mail ao encarregado
          </button>
          <p className="text-xs text-[#8E8E93]">
            Ao enviar, seu cliente de e-mail será aberto. Para canal oficial definitivo, substitua {DPO_EMAIL} pelo
            endereço do DPO publicado pela empresa controladora.
          </p>
        </form>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-[#1C1C1E]">Reclamação à ANPD</h2>
        <p className="mt-3">
          Sem prejuízo de outros meios de defesa de direitos, você pode peticionar em relação ao tratamento de dados
          perante a Autoridade Nacional de Proteção de Dados (ANPD), conforme procedimentos disponíveis no site oficial
          da autoridade.
        </p>
      </section>
    </PageShell>
  )
}
