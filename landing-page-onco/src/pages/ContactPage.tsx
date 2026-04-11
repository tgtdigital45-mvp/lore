import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { PageShell } from '../components/PageShell'

const CHANNELS = [
  {
    title: 'Geral e suporte',
    email: 'contato@onco.app',
    desc: 'Dúvidas sobre o aplicativo, uso do site ou suporte ao paciente.',
    subjects: 'Suporte, dúvida sobre conta, sugestões',
  },
  {
    title: 'Comercial e instituições',
    email: 'comercial@onco.app',
    desc: 'Hospitais, clínicas e parcerias: painel de triagem, integrações e contratos.',
    subjects: 'Demonstração do dashboard, proposta comercial, integração técnica',
  },
  {
    title: 'Privacidade e encarregado (DPO)',
    email: 'privacidade@onco.app',
    desc: 'Solicitações relacionadas à LGPD, dados pessoais e políticas de privacidade.',
    subjects: 'Ver também a página LGPD para formulário estruturado',
  },
] as const

export function ContactPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [channel, setChannel] = useState<string>(CHANNELS[0].email)
  const [topic, setTopic] = useState('')
  const [message, setMessage] = useState('')

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const subject = encodeURIComponent(`${topic || 'Contato pelo site'} — ${name || 'Onco'}`)
    const body = encodeURIComponent(
      `Canal escolhido: ${channel}\nNome: ${name}\nE-mail: ${email}\nAssunto: ${topic}\n\nMensagem:\n${message}`,
    )
    window.location.href = `mailto:${channel}?subject=${subject}&body=${body}`
  }

  return (
    <PageShell
      title="Contato"
      description="Escolha o canal adequado. Para direitos do titular (LGPD), use também a página dedicada com formulário estruturado."
    >
      <div className="grid gap-4 sm:grid-cols-1">
        {CHANNELS.map((c) => (
          <div
            key={c.email}
            className="rounded-2xl border border-[#E5E5EA] bg-white p-5 shadow-sm"
          >
            <h2 className="text-lg font-semibold text-[#1C1C1E]">{c.title}</h2>
            <p className="mt-1 text-sm text-[#636366]">{c.desc}</p>
            <p className="mt-2 text-xs text-[#8E8E93]">Exemplos: {c.subjects}</p>
            <a
              href={`mailto:${c.email}`}
              className="mt-3 inline-flex font-semibold text-[#007AFF] underline-offset-2 hover:underline"
            >
              {c.email}
            </a>
          </div>
        ))}
      </div>

      <p className="text-sm text-[#636366]">
        Para solicitações formais nos termos da LGPD (Art. 18), prefira a página{' '}
        <Link to="/lgpd" className="font-semibold text-[#007AFF] underline-offset-2 hover:underline">
          LGPD — direitos do titular
        </Link>
        .
      </p>

      <form onSubmit={onSubmit} className="space-y-4 rounded-2xl bg-[#F2F2F7] p-6 ring-1 ring-black/5">
        <h2 className="text-lg font-semibold text-[#1C1C1E]">Enviar mensagem por e-mail</h2>
        <p className="text-sm text-[#636366]">
          O botão abre seu aplicativo de e-mail. Selecione o endereço de destino conforme o assunto.
        </p>
        <div>
          <label htmlFor="contact-channel" className="block text-sm font-medium text-[#1C1C1E]">
            Destino
          </label>
          <select
            id="contact-channel"
            value={channel}
            onChange={(ev) => setChannel(ev.target.value)}
            className="mt-1 w-full min-h-[44px] rounded-xl border border-[#E5E5EA] bg-white px-3 py-2 text-[#1C1C1E] outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/25"
          >
            {CHANNELS.map((c) => (
              <option key={c.email} value={c.email}>
                {c.title} ({c.email})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="contact-topic" className="block text-sm font-medium text-[#1C1C1E]">
            Assunto
          </label>
          <input
            id="contact-topic"
            type="text"
            value={topic}
            onChange={(ev) => setTopic(ev.target.value)}
            className="mt-1 w-full min-h-[44px] rounded-xl border border-[#E5E5EA] bg-white px-3 py-2 text-[#1C1C1E] outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/25"
            placeholder="Ex.: Dúvida sobre vínculo com hospital"
          />
        </div>
        <div>
          <label htmlFor="contact-name" className="block text-sm font-medium text-[#1C1C1E]">
            Nome
          </label>
          <input
            id="contact-name"
            name="name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(ev) => setName(ev.target.value)}
            className="mt-1 w-full min-h-[44px] rounded-xl border border-[#E5E5EA] bg-white px-3 py-2 text-[#1C1C1E] outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/25"
          />
        </div>
        <div>
          <label htmlFor="contact-email" className="block text-sm font-medium text-[#1C1C1E]">
            E-mail
          </label>
          <input
            id="contact-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            className="mt-1 w-full min-h-[44px] rounded-xl border border-[#E5E5EA] bg-white px-3 py-2 text-[#1C1C1E] outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/25"
          />
        </div>
        <div>
          <label htmlFor="contact-message" className="block text-sm font-medium text-[#1C1C1E]">
            Mensagem
          </label>
          <textarea
            id="contact-message"
            name="message"
            required
            rows={5}
            value={message}
            onChange={(ev) => setMessage(ev.target.value)}
            className="mt-1 w-full resize-y rounded-xl border border-[#E5E5EA] bg-white px-3 py-2 text-[#1C1C1E] outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/25"
          />
        </div>
        <button
          type="submit"
          className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl bg-[#007AFF] px-6 py-3 font-semibold text-white transition hover:bg-[#0066DD] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007AFF] sm:w-auto"
        >
          Abrir e-mail para enviar
        </button>
        <p className="text-xs text-[#8E8E93]">
          Substitua os domínios @onco.app pelos endereços oficiais da empresa em produção.
        </p>
      </form>
    </PageShell>
  )
}
