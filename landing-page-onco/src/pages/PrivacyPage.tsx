import { Link } from 'react-router-dom'
import { PageShell } from '../components/PageShell'
import { COMPANY_CNPJ, COMPANY_LEGAL_NAME, COMPANY_TRADE_NAME, DPO_EMAIL } from '../lib/companyLegal'

const VIGENCY = '20 de abril de 2026'

export function PrivacyPage() {
  return (
    <PageShell
      size="full"
      title="Política de privacidade"
      description="Como a TGT trata dados pessoais e de saúde no ecossistema Aura-Onco, em conformidade com a LGPD (Lei nº 13.709/2018)."
      lastUpdated={VIGENCY}
    >
      <p className="rounded-xl bg-[#F2F2F7] p-4 text-sm text-[#636366]">
        Dados cadastrais da controladora conforme CNPJ. Alterações relevantes à política devem ser alinhadas com{' '}
        <strong>advogado e DPO</strong>. Direitos do titular: também na página{' '}
        <Link to="/lgpd" className="font-semibold text-[#007AFF] underline-offset-2 hover:underline">
          LGPD
        </Link>
        .
      </p>

      <section>
        <p className="text-[#3A3A3C]">
          A <strong>{COMPANY_LEGAL_NAME}</strong> (&ldquo;{COMPANY_TRADE_NAME}&rdquo;, &ldquo;TGT&rdquo;,
          &ldquo;Nós&rdquo;), inscrita no CNPJ <strong>{COMPANY_CNPJ}</strong>, localizada em Cascavel-PR, valoriza a sua
          privacidade e está fortemente comprometida com a proteção dos seus dados pessoais e de saúde.
        </p>
        <p className="mt-4">
          Esta Política de Privacidade foi elaborada em estrita conformidade com a Lei Geral de Proteção de Dados
          Pessoais (LGPD — Lei nº 13.709/2018) e explica de forma transparente como coletamos, usamos, armazenamos e
          compartilhamos as suas informações ao utilizar o ecossistema <strong>Aura-Onco</strong>.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-[#1C1C1E]">1. Nossa posição no tratamento de dados</h2>
        <p className="mt-3">A natureza do tratamento depende da forma como você utiliza o Aura-Onco:</p>
        <ul className="mt-3 list-inside list-disc space-y-2 pl-1">
          <li>
            <strong>Controladora de dados:</strong> Quando você baixa o aplicativo de forma independente, criando uma
            conta para seu uso pessoal, a TGT é a controladora dos dados.
          </li>
          <li>
            <strong>Operadora de dados:</strong> Quando o Aura-Onco é fornecido a você pelo seu Hospital ou Clínica de
            tratamento, a instituição de saúde é a controladora, e a TGT atua como operadora (processando os dados
            conforme as instruções e contratos firmados com o hospital).
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-[#1C1C1E]">2. Quais dados coletamos</h2>
        <p className="mt-3">
          Para o funcionamento completo da nossa plataforma, coletamos as seguintes categorias de dados:
        </p>

        <h3 className="mt-6 font-semibold text-[#1C1C1E]">2.1. Dados pessoais de cadastro e identificação</h3>
        <ul className="mt-2 list-inside list-disc space-y-2">
          <li>Nome completo, CPF, data de nascimento, sexo biológico, tipagem sanguínea.</li>
          <li>Dados de contato (e-mail, telefone/WhatsApp, endereço, contatos de emergência).</li>
          <li>Credenciais de acesso (senhas criptografadas).</li>
        </ul>

        <h3 className="mt-6 font-semibold text-[#1C1C1E]">2.2. Dados pessoais sensíveis (dados de saúde)</h3>
        <p className="mt-2">
          Devido ao escopo oncológico da plataforma, coletamos ativamente dados sensíveis, que incluem, mas não se
          limitam a:
        </p>
        <ul className="mt-2 list-inside list-disc space-y-2">
          <li>
            <strong>Histórico clínico:</strong> Tipo de câncer primário, estadiamento, fase do cuidado, histórico médico,
            alergias, gestação.
          </li>
          <li>
            <strong>Tratamento:</strong> Protocolos de tratamento, medicamentos contínuos e de suporte, logs de
            quimioterapia/infusões.
          </li>
          <li>
            <strong>Sintomas e reações:</strong> Escalas de toxicidade (CTCAE), eventos adversos, temperatura, avaliações
            tumorais.
          </li>
          <li>
            <strong>Métricas de rotina e wearables:</strong> Sinais vitais (pressão arterial, glicemia, FC, SpO2),
            registros nutricionais e amostras de dispositivos vestíveis (caso você os conecte).
          </li>
          <li>
            <strong>Documentos e exames:</strong> Imagens, laudos em PDF e logs de biomarcadores inseridos por você ou
            pela clínica.
          </li>
        </ul>

        <h3 className="mt-6 font-semibold text-[#1C1C1E]">2.3. Dados de navegação, uso e metadados</h3>
        <p className="mt-2">
          Endereço de IP, logs de auditoria (ações realizadas no app, datas de check-in, visualização de prontuários),
          token de notificação push e interações via WhatsApp bot.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-[#1C1C1E]">3. Para que finalidades tratamos seus dados e bases legais</h2>
        <p className="mt-3">Só utilizamos seus dados amparados pela LGPD. As finalidades incluem:</p>
        <ul className="mt-3 list-inside list-disc space-y-2">
          <li>
            <strong>Prestação do serviço (execução de contrato):</strong> Para criar sua conta, permitir o agendamento,
            envio de lembretes de medicamentos, registros de diários de sintomas e acesso a materiais educativos.
          </li>
          <li>
            <strong>Tutela da saúde e proteção à vida:</strong> Para permitir que a equipe médica do hospital vinculado
            acompanhe sua evolução, acesse escores de risco, visualize métricas em tempo real e emita alertas de
            intervenção.
          </li>
          <li>
            <strong>Consentimento (para dados sensíveis e IA):</strong> Quando solicitamos ativamente sua permissão
            granular (no módulo <code className="rounded bg-[#F2F2F7] px-1.5 py-0.5 text-sm">patient_consents</code>)
            para:
            <ul className="mt-2 list-inside list-disc space-y-1 pl-4">
              <li>processar documentos médicos utilizando Inteligência Artificial (extração de OCR);</li>
              <li>notificações ativas via WhatsApp;</li>
              <li>
                finalidades de pesquisa científica e análises agregadas (sempre anonimizadas quando possível).
              </li>
            </ul>
          </li>
          <li>
            <strong>Obrigação legal e defesa de direitos:</strong> Para manter trilhas de auditoria, histórico de acessos
            (Marco Civil da Internet) e arquivamento de prontuário eletrônico conforme normas do CFM e ANVISA.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-[#1C1C1E]">4. Compartilhamento e subprocessadores</h2>
        <p className="mt-3">
          A TGT <strong>não vende</strong> ou comercializa seus dados pessoais. O compartilhamento ocorre apenas de
          forma estrita para a operação do sistema:
        </p>
        <ul className="mt-3 list-inside list-disc space-y-2">
          <li>
            <strong>Profissionais e instituições de saúde:</strong> Com a clínica ou hospital com o qual você vinculou
            seu perfil (<code className="rounded bg-[#F2F2F7] px-1.5 py-0.5 text-sm">patient_hospital_links</code>),
            para fins de cuidado direto.
          </li>
          <li>
            <strong>Parceiros de tecnologia (subprocessadores):</strong> Provedores de infraestrutura de nuvem (ex.:
            Supabase, AWS), APIs de mensagens (ex.: integradores de WhatsApp) e APIs de Inteligência Artificial para
            leitura de laudos. Asseguramos que os fornecedores relevantes são contratados com acordos de confidencialidade
            e proteção de dados (DPA), quando aplicável.
          </li>
          <li>
            <strong>Autoridades legais:</strong> Em caso de requisição judicial ou obrigação legal de reporte a autoridades
            sanitárias.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-[#1C1C1E]">5. Armazenamento e segurança da informação</h2>
        <p className="mt-3">
          Adotamos boas práticas de segurança da informação, com referência a padrões como ISO 27001, para proteger os
          dados de saúde contra acessos não autorizados, perdas ou vazamentos.
        </p>
        <ul className="mt-3 list-inside list-disc space-y-2">
          <li>O tráfego de dados é protegido via criptografia (TLS/SSL).</li>
          <li>
            Os dados são armazenados em servidores seguros do provedor de infraestrutura contratado; a localização
            física dos data centers e as salvaguardas para eventual transferência internacional podem ser detalhadas
            mediante solicitação ao DPO, conforme a LGPD.
          </li>
          <li>
            Utilizamos logs de auditoria (<code className="rounded bg-[#F2F2F7] px-1.5 py-0.5 text-sm">audit_logs</code>
            ) para rastrear acessos ao prontuário digital por parte de equipe técnica ou clínica autorizada.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-[#1C1C1E]">6. Retenção dos dados</h2>
        <p className="mt-3">
          Manteremos seus dados enquanto sua conta estiver ativa ou enquanto houver vínculo de tratamento hospitalar
          aplicável. Quando os dados constituírem documentação médica eletrônica, a TGT e os hospitais poderão ser
          obrigados a retê-los por até <strong>20 anos</strong>, conforme resolução do Conselho Federal de Medicina
          (CFM), independentemente de solicitação de exclusão, para fins legais e comprobatórios.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-[#1C1C1E]">7. Seus direitos como titular</h2>
        <p className="mt-3">
          Nos termos do art. 18 da LGPD, você tem o direito de, a qualquer momento, mediante requisição:
        </p>
        <ul className="mt-3 list-inside list-disc space-y-2">
          <li>confirmar a existência de tratamento e solicitar o acesso aos seus dados;</li>
          <li>corrigir dados incompletos, inexatos ou desatualizados;</li>
          <li>
            revogar seu consentimento para processamento de pesquisas ou interações específicas (ex.: opt-out do
            WhatsApp);
          </li>
          <li>solicitar a portabilidade dos dados para outro fornecedor, resguardados os segredos comerciais;</li>
          <li>
            solicitar a exclusão dos dados (sujeito às exceções legais de retenção obrigatória de prontuários médicos).
          </li>
        </ul>
        <p className="mt-3">
          Detalhes e canais:{' '}
          <Link to="/lgpd" className="font-semibold text-[#007AFF] underline-offset-2 hover:underline">
            LGPD — direitos do titular
          </Link>
          . Exclusão de conta:{' '}
          <Link to="/exclusao-conta" className="font-semibold text-[#007AFF] underline-offset-2 hover:underline">
            Exclusão de conta e dados
          </Link>
          .
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-[#1C1C1E]">8. Contato e encarregado de dados (DPO)</h2>
        <p className="mt-3">
          Se você tiver dúvidas, quiser exercer seus direitos ou relatar um incidente relacionado à privacidade, entre em
          contato com nosso encarregado de proteção de dados (Data Protection Officer — DPO) através do e-mail:{' '}
          <a href={`mailto:${DPO_EMAIL}`} className="font-semibold text-[#007AFF] underline-offset-2 hover:underline">
            {DPO_EMAIL}
          </a>{' '}
          (ou através da aba de Suporte no aplicativo).
        </p>
        <p className="mt-4 text-sm text-[#636366]">
          <strong>{COMPANY_TRADE_NAME}</strong> ({COMPANY_LEGAL_NAME})
          <br />
          R Parana, 2781, Sala 1, Centro, Cascavel - PR, CEP 85.812-011
        </p>
        <p className="mt-3">
          <Link to="/contato" className="font-semibold text-[#007AFF] underline-offset-2 hover:underline">
            Central de contato
          </Link>
        </p>
        <p className="mt-3">
          Você também pode apresentar reclamação à Autoridade Nacional de Proteção de Dados (ANPD), conforme
          regulamentação em vigor.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-[#1C1C1E]">Disposições adicionais</h2>
        <p className="mt-3">
          <strong>Cookies e site:</strong> o site institucional pode usar cookies ou armazenamento local estritamente
          necessários ao funcionamento ou medição de audiência, conforme avisos legais aplicáveis.
        </p>
        <p className="mt-3">
          <strong>Menores:</strong> o serviço é destinado a maiores de 18 anos ou a menores com consentimento ou
          responsabilidade do representante legal, conforme permitido pela lei e pelos fluxos do aplicativo.
        </p>
        <p className="mt-3">
          <strong>Alterações:</strong> podemos atualizar esta política; a data de atualização consta no topo. Alterações
          relevantes poderão ser comunicadas por meios adequados (aplicativo, e-mail ou aviso no site).
        </p>
      </section>
    </PageShell>
  )
}
