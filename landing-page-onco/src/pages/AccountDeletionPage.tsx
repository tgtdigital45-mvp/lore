import { Link } from 'react-router-dom'
import { PageShell } from '../components/PageShell'
import { COMPANY_CNPJ, COMPANY_LEGAL_NAME, COMPANY_TRADE_NAME, DPO_EMAIL } from '../lib/companyLegal'

const VIGENCY = '14 de abril de 2026'

/**
 * Página dedicada aos requisitos do Google Play (Data safety) para URL de exclusão de conta.
 * Cole na Play Console: https://<seu-dominio>/exclusao-conta
 */
export function AccountDeletionPage() {
  return (
    <PageShell
      size="full"
      title="Exclusão de conta e dados — aplicativo Onco"
      description="Como solicitar a exclusão da sua conta e dos dados pessoais associados ao aplicativo Onco (pacientes), em linha com a LGPD."
      lastUpdated={VIGENCY}
    >
      <p className="rounded-xl bg-[#F2F2F7] p-4 text-sm text-[#636366]">
        Esta página atende ao requisito da Google Play de divulgar um link público para pedido de exclusão de conta.
        Controladora identificada conforme cadastro CNPJ.
      </p>

      <section>
        <h2 className="text-xl font-semibold text-[#1C1C1E]">Aplicativo e controlador</h2>
        <p className="mt-3">
          <strong>Aplicativo:</strong> Onco (aplicativo móvel para pacientes em acompanhamento oncológico).
        </p>
        <p className="mt-3">
          <strong>Controlador dos dados:</strong> {COMPANY_LEGAL_NAME} ({COMPANY_TRADE_NAME}), CNPJ {COMPANY_CNPJ},
          conforme detalhes na nossa{' '}
          <Link to="/privacidade" className="font-semibold text-[#007AFF] underline-offset-2 hover:underline">
            Política de privacidade
          </Link>
          .
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-[#1C1C1E]">Como solicitar a exclusão da conta</h2>
        <ol className="mt-3 list-inside list-decimal space-y-3">
          <li>
            Envie um e-mail para o encarregado de dados (DPO) em{' '}
            <a
              href={`mailto:${DPO_EMAIL}?subject=Exclus%C3%A3o%20de%20conta%20-%20app%20Onco`}
              className="font-semibold text-[#007AFF] underline-offset-2 hover:underline"
            >
              {DPO_EMAIL}
            </a>{' '}
            com o assunto sugerido: “Exclusão de conta — app Onco”.
          </li>
          <li>
            No corpo da mensagem, informe o <strong>e-mail da conta</strong> usado no login do aplicativo (e, se possível,
            nome completo) para confirmarmos sua identidade.
          </li>
          <li>
            Responderemos em prazo compatível com a LGPD, podendo solicitar informações adicionais mínimas apenas para
            evitar exclusões indevidas (ex.: confirmação de titularidade).
          </li>
        </ol>
        <p className="mt-4 text-sm text-[#636366]">
          Se no futuro existir opção de exclusão dentro do próprio aplicativo, esta página será atualizada; até lá, o
          canal oficial é o e-mail acima.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-[#1C1C1E]">O que é excluído</h2>
        <ul className="mt-3 list-inside list-disc space-y-2">
          <li>
            <strong>Conta de usuário:</strong> desativação e eliminação dos dados de perfil e credenciais associadas à
            conta do aplicativo, quando não houver obrigação legal de manter.
          </li>
          <li>
            <strong>Dados inseridos no app:</strong> em regra, dados de saúde, sintomas, medicações, registros e
            arquivos vinculados à conta serão eliminados ou anonimizados após o encerramento, conforme política interna e
            prazo de backup seguro.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-[#1C1C1E]">O que pode ser mantido (temporariamente ou por lei)</h2>
        <ul className="mt-3 list-inside list-disc space-y-2">
          <li>
            <strong>Obrigações legais:</strong> informações que devamos conservar por ordem legal, regulatória ou
            defesa em processos (ex.: prazos mínimos de guarda), na extensão permitida pela lei.
          </li>
          <li>
            <strong>Backups:</strong> cópias residuais em sistemas de backup podem persistir por um período técnico
            limitado e depois serem sobrescritas; não serão usadas para novas finalidades.
          </li>
          <li>
            <strong>Dados agregados ou anonimizados</strong> que não permitam identificação do titular podem ser
            retidos para estatísticas e melhoria do serviço.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-[#1C1C1E]">Exclusão parcial de dados (sem encerrar a conta)</h2>
        <p className="mt-3">
          Você também pode pedir correção, anonimização ou eliminação de categorias específicas de dados, sem excluir a
          conta inteira, pelos canais indicados na{' '}
          <Link to="/lgpd" className="font-semibold text-[#007AFF] underline-offset-2 hover:underline">
            página LGPD
          </Link>{' '}
          e na Política de privacidade.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-[#1C1C1E]">Contato</h2>
        <p className="mt-3">
          Dúvidas sobre este processo:{' '}
          <a href={`mailto:${DPO_EMAIL}`} className="font-semibold text-[#007AFF] underline-offset-2 hover:underline">
            {DPO_EMAIL}
          </a>
          . Para outros assuntos:{' '}
          <Link to="/contato" className="font-semibold text-[#007AFF] underline-offset-2 hover:underline">
            Central de contato
          </Link>
          .
        </p>
      </section>
    </PageShell>
  )
}
