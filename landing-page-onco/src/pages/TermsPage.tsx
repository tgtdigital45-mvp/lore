import { Link } from 'react-router-dom'
import { PageShell } from '../components/PageShell'

const VIGENCY = '20 de abril de 2026'

export function TermsPage() {
  return (
    <PageShell
      size="full"
      title="Termos e condições de uso"
      description="Termos gerais de acesso e uso do ecossistema Aura-Onco (aplicativo móvel, dashboard web e integrações via WhatsApp), operado pela TGT Soluções Digitais LTDA."
      lastUpdated={VIGENCY}
    >
      <p className="rounded-xl bg-[#F2F2F7] p-4 text-sm text-[#636366]">
        Este documento tem caráter informativo e deve ser <strong>revisado por advogado</strong> antes de uso em
        produção. A identificação da controladora e o tratamento de dados constam na{' '}
        <Link to="/privacidade" className="font-semibold text-[#007AFF] underline-offset-2 hover:underline">
          Política de privacidade
        </Link>
        .
      </p>

      <section>
        <p className="text-[#3A3A3C]">
          Estes Termos de Uso (&ldquo;Termos&rdquo;) regem o acesso e uso do ecossistema de software{' '}
          <strong>Aura-Onco</strong> (incluindo aplicativo móvel, dashboard web e integrações via WhatsApp), operado e de
          propriedade da <strong>TGT SOLUÇÕES DIGITAIS LTDA</strong> (nome fantasia &ldquo;True Growth Technology&rdquo;),
          pessoa jurídica de direito privado, inscrita no CNPJ sob o nº <strong>58.671.826/0001-62</strong>, com sede na
          R Parana, 2781, Sala 1, Centro, Cascavel - PR, CEP 85.812-011 (&ldquo;TGT&rdquo; ou &ldquo;Nós&rdquo;).
        </p>
        <p className="mt-4">
          Ao criar uma conta e utilizar o Aura-Onco, o usuário (&ldquo;Você&rdquo;, &ldquo;Paciente&rdquo;,
          &ldquo;Cuidador&rdquo; ou &ldquo;Profissional de Saúde&rdquo;) concorda integralmente com estes Termos. Se você
          não concordar com qualquer disposição, não deverá utilizar a plataforma.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-[#1C1C1E]">
          1. Natureza e finalidade do ecossistema (aviso médico importante)
        </h2>
        <p className="mt-3">
          <strong>1.1. O ecossistema Aura-Onco:</strong> O Aura-Onco é uma plataforma de tecnologia em saúde (HealthTech)
          desenhada para facilitar a jornada oncológica, composta por duas frentes complementares que garantem o controle
          dos dados pelo usuário:
        </p>
        <p className="mt-3">
          <strong>Aplicativo do Paciente (Prontuário Pessoal):</strong> Destinado ao paciente oncológico para o registro
          e acompanhamento de toda a sua trajetória. Ele funciona como um prontuário digital unificado e de posse do
          titular, eliminando a necessidade de o paciente carregar pastas de papel, laudos e exames físicos a cada nova
          consulta médica.
        </p>
        <p className="mt-3">
          <strong>Dashboard Hospitalar:</strong> É o portal de visualização web destinado a hospitais, clínicas e equipes
          de saúde. O acesso da instituição aos dados do paciente não é automático. Para que o hospital visualize as
          informações no dashboard, o paciente deve, de forma autônoma e voluntária, gerar um código de compartilhamento
          em seu aplicativo. A instituição de saúde então insere este código no sistema para ser autorizada a acompanhar
          o histórico.
        </p>
        <p className="mt-3">
          <strong>1.2. Não é aconselhamento médico:</strong> A TGT não presta serviços médicos, de enfermagem ou
          farmacêuticos. Nenhuma informação, alerta, escore de risco ou conteúdo gerado pela plataforma — incluindo
          aqueles processados por Inteligência Artificial (IA) — substitui o diagnóstico, aconselhamento, prescrição ou
          tratamento fornecido por profissionais de saúde habilitados.
        </p>
        <p className="mt-3">
          <strong>1.3. Uso em emergências:</strong> O Aura-Onco não deve ser utilizado para emergências médicas. Em caso
          de emergência ou sintomas agudos graves, o paciente deve procurar imediatamente um pronto-socorro ou acionar
          os serviços de urgência locais.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-[#1C1C1E]">2. Cadastro e responsabilidades do usuário</h2>
        <p className="mt-3">
          <strong>2.1. Veracidade das informações:</strong> Você é inteiramente responsável pela precisão e veracidade
          dos dados inseridos na plataforma (clínicos, demográficos, vitais, etc.). O preenchimento incorreto de dados
          (como peso, dosagens de medicamentos ou sintomas) pode gerar históricos imprecisos.
        </p>
        <p className="mt-3">
          <strong>2.2. Credenciais de acesso:</strong> O login e a senha são de uso pessoal, confidencial e
          intransferível. Qualquer ação realizada sob a sua conta será de sua exclusiva responsabilidade.
        </p>
        <p className="mt-3">
          <strong>2.3. Perfis de usuário:</strong> O acesso é segmentado conforme o perfil (Paciente, Cuidador, Equipe
          Clínica/Hospital). É proibido tentar acessar painéis ou dados que não correspondam ao seu nível de permissão.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-[#1C1C1E]">3. Integração com hospitais e clínicas (B2B2C)</h2>
        <p className="mt-3">
          <strong>3.1. Mecânica de vínculo:</strong> O compartilhamento de dados com uma instituição médica ocorre
          exclusivamente quando Você decide repassar o seu código de paciente gerado pelo aplicativo para que o hospital
          vincule o seu prontuário pessoal ao Dashboard da instituição. Você pode revogar esse acesso a qualquer momento
          através do próprio aplicativo.
        </p>
        <p className="mt-3">
          <strong>3.2. Responsabilidade da instituição:</strong> Ao estabelecer o vínculo através do código, aplicam-se
          também as políticas internas do Hospital ou Clínica que o atende. Nesses casos, a TGT atua apenas como
          fornecedora da tecnologia (operadora de dados), e a instituição de saúde assume a responsabilidade primária
          pelas decisões, condutas e intervenções clínicas baseadas na visualização desses dados.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-[#1C1C1E]">4. Funcionalidades baseadas em inteligência artificial e OCR</h2>
        <p className="mt-3">
          <strong>4.1.</strong> O Aura-Onco pode utilizar tecnologias de Reconhecimento Ótico de Caracteres (OCR) e
          Inteligência Artificial (IA) para facilitar a extração de dados de exames físicos em papel ou PDF, ajudando a
          estruturar o seu prontuário pessoal digital.
        </p>
        <p className="mt-3">
          <strong>4.2.</strong> O Usuário compreende que sistemas de IA são suscetíveis a margens de erro (alucinações
          ou imprecisões na leitura). Todo dado extraído automaticamente deve ser revisado e validado por um humano (por
          Você ou pela sua equipe médica) antes de ser considerado oficial.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-[#1C1C1E]">5. Propriedade intelectual</h2>
        <p className="mt-3">
          <strong>5.1.</strong> Todos os direitos de propriedade intelectual sobre o software Aura-Onco, seu código-fonte,
          design, logotipos, algoritmos, escores de risco proprietários e interfaces são de titularidade exclusiva da
          TGT Soluções Digitais LTDA.
        </p>
        <p className="mt-3">
          <strong>5.2.</strong> É expressamente proibido realizar engenharia reversa, copiar, modificar, distribuir ou
          comercializar qualquer parte da plataforma sem autorização prévia e por escrito.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-[#1C1C1E]">6. Limitação de responsabilidade</h2>
        <p className="mt-3">
          <strong>6.1.</strong> A TGT emprega os melhores esforços para garantir a disponibilidade contínua do sistema,
          mas não garante que a plataforma estará livre de interrupções, atrasos ou falhas técnicas decorrentes de
          fatores externos (como falhas de conectividade ou provedores de nuvem).
        </p>
        <p className="mt-3">
          <strong>6.2.</strong> A TGT não se responsabiliza por:
        </p>
        <ul className="mt-2 list-inside list-disc space-y-2 pl-1">
          <li>
            decisões médicas, diagnósticos ou tratamentos adotados por profissionais com base na visualização do
            aplicativo ou do dashboard;
          </li>
          <li>
            danos diretos ou indiretos decorrentes da inserção de dados incorretos ou documentos ilegíveis por parte do
            usuário;
          </li>
          <li>
            falhas no recebimento de notificações (ex.: lembretes de medicamentos ou via WhatsApp) caso os dispositivos
            do usuário estejam offline, configurados incorretamente ou devido a restrições de operadoras de telefonia.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-[#1C1C1E]">7. Modificações dos termos</h2>
        <p className="mt-3">
          A TGT reserva-se o direito de alterar estes Termos a qualquer momento, para refletir atualizações legais,
          regulatórias ou mudanças nas funcionalidades do software. Notificaremos os usuários sobre alterações materiais
          através do próprio aplicativo ou por e-mail.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-[#1C1C1E]">8. Foro e legislação aplicável</h2>
        <p className="mt-3">
          Estes Termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro da Comarca de
          Cascavel, Estado do Paraná, para dirimir quaisquer controvérsias decorrentes destes Termos, com renúncia
          expressa a qualquer outro, por mais privilegiado que seja.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-[#1C1C1E]">Contato e dúvidas</h2>
        <p className="mt-3">
          Questões sobre estes Termos:{' '}
          <Link to="/contato" className="font-semibold text-[#007AFF] underline-offset-2 hover:underline">
            Contato
          </Link>
          . Tratamento de dados pessoais:{' '}
          <Link to="/privacidade" className="font-semibold text-[#007AFF] underline-offset-2 hover:underline">
            Política de privacidade
          </Link>{' '}
          e{' '}
          <Link to="/lgpd" className="font-semibold text-[#007AFF] underline-offset-2 hover:underline">
            LGPD
          </Link>
          .
        </p>
      </section>
    </PageShell>
  )
}
