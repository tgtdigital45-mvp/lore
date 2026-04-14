import { Link } from 'react-router-dom'
import { PageShell } from '../components/PageShell'

const VIGENCY = '11 de abril de 2026'

export function PrivacyPage() {
  return (
    <PageShell
      size="full"
      title="Política de privacidade"
      description="Informações sobre como tratamos dados pessoais no site, no aplicativo Onco para pacientes e no painel web para instituições de saúde, em conformidade com a LGPD (Lei nº 13.709/2018)."
      lastUpdated={VIGENCY}
    >
      <p className="rounded-xl bg-[#F2F2F7] p-4 text-sm text-[#636366]">
        Preencha os campos [ENTRE COLCHETES] com razão social, CNPJ, endereço e contatos oficiais. Revise com{' '}
        <strong>advogado e DPO</strong> antes da publicação.
      </p>

      <section>
        <h2 className="text-xl font-semibold text-[#1C1C1E]">1. Controlador e encarregado (DPO)</h2>
        <p className="mt-3">
          <strong>Controlador:</strong> [Razão social], CNPJ [•••], com sede em [endereço completo].
        </p>
        <p className="mt-3">
          <strong>Encarregado de dados (DPO):</strong> [Nome ou departamento] — contato:{' '}
          <a href="mailto:privacidade@onco.app" className="font-semibold text-[#007AFF] underline-offset-2 hover:underline">
            privacidade@onco.app
          </a>{' '}
          (substituir pelo e-mail oficial).
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-[#1C1C1E]">2. Abrangência</h2>
        <p className="mt-3">
          Esta política aplica-se ao tratamento de dados pessoais em: (i) site institucional; (ii){' '}
          <strong>aplicativo móvel Onco</strong> (pacientes); (iii){' '}
          <strong>painel/dashboard para hospitais e clínicas</strong> (profissionais e administradores autorizados),
          sempre respeitando contratos, finalidades e bases legais aplicáveis.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-[#1C1C1E]">3. Dados coletados</h2>

        <h3 className="mt-4 font-semibold text-[#1C1C1E]">3.1 Aplicativo (paciente)</h3>
        <ul className="mt-2 list-inside list-disc space-y-2">
          <li>
            <strong>Cadastro e conta:</strong> nome, e-mail, telefone (quando informados), identificadores técnicos de
            autenticação (ex.: ID de usuário no provedor de login).
          </li>
          <li>
            <strong>Dados de saúde:</strong> registros de sintomas, medicações, ciclos de tratamento, documentos
            enviados (exames), notas e demais informações que você inserir voluntariamente.
          </li>
          <li>
            <strong>Dados técnicos:</strong> tipo de dispositivo, sistema operacional, logs de eventos, tokens de
            notificação push, endereço IP e data/hora de acesso, necessários à segurança e funcionamento.
          </li>
        </ul>

        <h3 className="mt-6 font-semibold text-[#1C1C1E]">3.2 Dashboard hospitalar (instituição)</h3>
        <ul className="mt-2 list-inside list-disc space-y-2">
          <li>
            <strong>Cadastro de usuários da instituição:</strong> nome, e-mail corporativo, perfil de acesso,
            vínculo com hospital/clínica.
          </li>
          <li>
            <strong>Operação do serviço:</strong> registros de acesso a prontuários resumidos, listas de triagem,
            mensagens institucionais enviadas por canais integrados (quando habilitados), conforme permissões.
          </li>
          <li>
            <strong>Auditoria e conformidade:</strong> logs de visualização de dados de pacientes vinculados,
            carimbo de data/hora e identificação do usuário da instituição, quando aplicável à política interna e à
            lei.
          </li>
        </ul>
        <p className="mt-3">
          O acesso da instituação a dados de pacientes ocorre mediante <strong>vínculo aprovado pelo titular</strong>{' '}
          no aplicativo e níveis de permissão contratados.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-[#1C1C1E]">4. Finalidades</h2>
        <ul className="mt-3 list-inside list-disc space-y-2">
          <li>Prestação do serviço contratado e melhoria da experiência (interface, desempenho, suporte);</li>
          <li>Segurança, prevenção a fraudes e cumprimento de obrigações legais;</li>
          <li>Comunicações necessárias sobre a conta, avisos importantes e, com base em consentimento, novidades;</li>
          <li>Para o dashboard: triagem, continuidade assistencial e auditoria, conforme autorização do titular e base legal;</li>
          <li>Geração de relatórios agregados ou anonimizados quando possível, para estatísticas e produto.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-[#1C1C1E]">5. Bases legais (arts. 7º e 11 da LGPD)</h2>
        <p className="mt-3">
          Tratamos dados com fundamento em: <strong>execução de contrato</strong> ou procedimentos preliminares;
          <strong> cumprimento de obrigação legal</strong> ou regulatória; <strong>consentimento</strong>, quando
          exigido (incluindo dados sensíveis de saúde e compartilhamentos específicos); <strong>legítimo interesse</strong>,
          observados seus direitos e expectativas; <strong>proteção da vida</strong>; e outras hipóteses legais
          aplicáveis ao caso concreto, documentadas internamente (registro de operações de tratamento — ROPA).
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-[#1C1C1E]">6. Compartilhamento</h2>
        <ul className="mt-3 list-inside list-disc space-y-2">
          <li>
            <strong>Prestadores de infraestrutura e tecnologia</strong> (ex.: hospedagem, banco de dados, autenticação,
            envio de notificações, armazenamento de arquivos), contratados com cláusulas de confidencialidade e
            proteção de dados.
          </li>
          <li>
            <strong>Instituições de saúde</strong> quando você <strong>autorizar o vínculo</strong> e conforme escopo
            (leitura, leitura e registro, etc.).
          </li>
          <li>
            <strong>Autoridades públicas</strong>, quando houver obrigação legal ou ordem judicial fundamentada.
          </li>
        </ul>
        <p className="mt-3">
          <strong>Não vendemos</strong> seus dados pessoais a terceiros para fins de marketing de terceiros.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-[#1C1C1E]">7. Transferência internacional</h2>
        <p className="mt-3">
          Parte da infraestrutura pode estar em nuvem com servidores fora do Brasil (ex.: provedores globais). Nesses
          casos, adotamos salvaguardas previstas na LGPD (cláusulas contratuais padrão, certificações e avaliação de
          país com nível adequado de proteção, quando aplicável).
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-[#1C1C1E]">8. Segurança</h2>
        <p className="mt-3">
          Utilizamos medidas técnicas e organizacionais compatíveis com o risco, incluindo comunicação criptografada em
          trânsito (TLS), controles de acesso, segregação de ambientes, políticas de senha onde aplicável, e no banco
          de dados mecanismos como <strong>RLS (Row Level Security)</strong> para restringir acesso por perfil. Dados
          sensíveis exigem cuidado redobrado e minimização.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-[#1C1C1E]">9. Retenção e eliminação</h2>
        <p className="mt-3">
          Mantemos os dados pelo tempo necessário às finalidades descritas, ao cumprimento legal e à resolução de
          disputas. Após exclusão de conta ou término da base legal aplicável, procedemos à eliminação ou anonimização,
          salvo retenção mínima exigida por lei (ex.: obrigações contábeis ou ordens regulatórias).
        </p>
      </section>

      <section>
        <h2 id="lgpd" className="scroll-mt-24 text-xl font-semibold text-[#1C1C1E]">
          10. Direitos do titular (Art. 18 da LGPD)
        </h2>
        <p className="mt-3">
          Você pode solicitar confirmação de tratamento, acesso, correção, anonimização, bloqueio ou eliminação,
          portabilidade, informação sobre compartilhamentos e revogação de consentimento, conforme a lei. Detalhes e
          canais na página{' '}
          <Link to="/lgpd" className="font-semibold text-[#007AFF] underline-offset-2 hover:underline">
            LGPD — direitos do titular
          </Link>
          .
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-[#1C1C1E]">11. Cookies e tecnologias similares (site)</h2>
        <p className="mt-3">
          O site pode usar cookies ou armazenamento local estritamente necessários ao funcionamento, medição de
          audiência ou preferências, conforme banner/aviso de cookies quando implementado e granularidade permitida pela
          legislação.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-[#1C1C1E]">12. Menores de idade</h2>
        <p className="mt-3">
          O Serviço é destinado a maiores de 18 anos ou utilizado por menor com consentimento/responsabilidade do
          representante legal, conforme permitido pela lei e pelos fluxos do aplicativo.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-[#1C1C1E]">13. Alterações desta política</h2>
        <p className="mt-3">
          Podemos atualizar esta política para refletir mudanças legais ou do Serviço. A data de atualização será
          indicada no topo. Alterações relevantes poderão ser comunicadas por meios adequados.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-[#1C1C1E]">14. Contato e reclamações</h2>
        <p className="mt-3">
          Encarregado/DPO: e-mail acima. Você também pode apresentar reclamação à Autoridade Nacional de Proteção de
          Dados (ANPD), conforme regulamentação.
        </p>
        <p className="mt-3">
          <Link to="/contato" className="font-semibold text-[#007AFF] underline-offset-2 hover:underline">
            Central de contato
          </Link>
        </p>
      </section>
    </PageShell>
  )
}
