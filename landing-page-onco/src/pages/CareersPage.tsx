import { PageShell } from '../components/PageShell'

export function CareersPage() {
  return (
    <PageShell
      title="Carreiras"
      description="Estamos construindo o futuro do acompanhamento oncológico no Brasil."
    >
      <p>
        Não há vagas abertas publicadas no momento. Envie seu perfil e área de interesse para{' '}
        <a
          href="mailto:rh@onco.app?subject=Candidatura%20espont%C3%A2nea%20%E2%80%93%20Onco"
          className="font-semibold text-[#007AFF] underline-offset-2 hover:underline"
        >
          rh@onco.app
        </a>
        .
      </p>
      <p className="text-sm text-[#8E8E93]">
        Substitua o domínio de e-mail pelos endereços oficiais da sua empresa quando estiverem definidos.
      </p>
    </PageShell>
  )
}
