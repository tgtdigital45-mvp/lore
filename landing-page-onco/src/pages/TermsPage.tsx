import { Link } from 'react-router-dom'
import { PageShell } from '../components/PageShell'

const VIGENCY = '11 de abril de 2026'

export function TermsPage() {
  return (
    <PageShell
      size="full"
      title="Termos de uso"
      description="Termos gerais de uso do site, do aplicativo móvel Onco e do painel web para instituições de saúde (quando aplicável)."
      lastUpdated={VIGENCY}
    >
      <p className="rounded-xl bg-[#F2F2F7] p-4 text-sm text-[#636366]">
        Este documento tem caráter informativo e deve ser <strong>revisado por advogado</strong> antes de uso em
        produção. Substitua referências genéricas (razão social, CNPJ, endereço, e-mails) pelos dados oficiais da
        empresa controladora.
      </p>

      <section>
        <h2 className="text-xl font-semibold text-[#1C1C1E]">1. Definições</h2>
        <ul className="mt-3 list-inside list-disc space-y-2">
          <li>
            <strong>Onco</strong> ou <strong>Serviço</strong>: conjunto de software, site, aplicativo móvel, APIs e
            documentação associados à marca Onco.
          </li>
          <li>
            <strong>Usuário</strong>: pessoa física ou jurídica que acessa o site ou utiliza o aplicativo ou o painel
            institucional.
          </li>
          <li>
            <strong>Aplicativo</strong>: aplicativo móvel Onco destinado a pacientes e cuidadores autorizados.
          </li>
          <li>
            <strong>Dashboard / Painel hospitalar</strong>: interface web para equipes de instituições de saúde
            contratantes, sujeita a termos comerciais específicos e autorizações do titular dos dados.
          </li>
          <li>
            <strong>Controlador</strong>: pessoa jurídica responsável pelo tratamento de dados, conforme Política de
            Privacidade.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-[#1C1C1E]">2. Aceitação</h2>
        <p className="mt-3">
          Ao acessar o site, criar conta, utilizar o aplicativo ou o painel institucional, você declara ter lido e
          compreendido estes Termos, a{' '}
          <Link to="/privacidade" className="font-semibold text-[#007AFF] underline-offset-2 hover:underline">
            Política de privacidade
          </Link>{' '}
          e demais avisos legais aplicáveis. Se não concordar, não utilize o Serviço.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-[#1C1C1E]">3. Descrição do serviço</h2>
        <p className="mt-3">
          O Onco oferece ferramentas digitais para apoio ao acompanhamento de saúde, incluindo registro de sintomas,
          medicações, tratamentos, documentos e relatórios. O <strong>Dashboard hospitalar</strong>, quando
          contratado, permite que instituições visualizem dados de pacientes que <strong>autorizarem o vínculo</strong>
          , conforme fluxos no aplicativo e legislação aplicável.
        </p>
        <p className="mt-3">
          O Serviço <strong>não constitui consulta médica, diagnóstico, prescrição ou emergência</strong>. Em caso de
          urgência, procure serviço de saúde presencial ou ligue para os números de emergência (192/193 no Brasil,
          conforme o caso).
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-[#1C1C1E]">4. Elegibilidade e cadastro</h2>
        <p className="mt-3">
          Você declara ter capacidade civil para contratar ou estar representado legalmente. As informações fornecidas
          devem ser verdadeiras e atualizadas. Você é responsável pela <strong>confidencialidade da senha</strong> e
          pelas atividades realizadas na sua conta. Comunique imediatamente qualquer uso não autorizado.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-[#1C1C1E]">5. Uso permitido e condutas proibidas</h2>
        <p className="mt-3">É permitido usar o Serviço de acordo com a lei, estes Termos e a finalidade prevista.</p>
        <p className="mt-3">É vedado, entre outros:</p>
        <ul className="mt-2 list-inside list-disc space-y-2">
          <li>violar direitos de terceiros ou normas de proteção de dados e segredo profissional;</li>
          <li>introduzir código malicioso, fazer engenharia reversa indevida ou tentar acessar áreas não autorizadas;</li>
          <li>utilizar o Serviço para fins ilícitos, discriminatórios ou que comprometam a segurança da plataforma;</li>
          <li>extrair dados em larga escala (scraping) sem autorização expressa.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-[#1C1C1E]">6. Propriedade intelectual</h2>
        <p className="mt-3">
          Marca, logotipos, layout, textos da interface, código e conteúdos proprietários do Onco são protegidos por
          direitos de propriedade intelectual. Concede-se ao Usuário licença limitada, revogável e não exclusiva para
          uso do Serviço conforme estes Termos. Nenhuma cláusula transfere titularidade salvo disposição escrita.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-[#1C1C1E]">7. Isenção quanto a conteúdo médico</h2>
        <p className="mt-3">
          Conteúdos educativos ou sugestões exibidas no app ou no site são informativos e não substituem avaliação
          profissional. Decisões terapêuticas cabem ao médico ou equipe assistencial habilitada.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-[#1C1C1E]">8. Limitação de responsabilidade</h2>
        <p className="mt-3">
          Na extensão máxima permitida pela legislação brasileira, incluindo o Código de Defesa do Consumidor quando
          aplicável, o Serviço é oferecido &ldquo;no estado em que se encontra&rdquo;. Não garantimos disponibilidade
          ininterrupta ou ausência de erros. Não nos responsabilizamos por danos indiretos, lucros cessantes, perda de
          dados decorrente de culpa exclusiva do Usuário ou de terceiros, ou por caso fortuito/força maior.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-[#1C1C1E]">9. Modificações do serviço e dos termos</h2>
        <p className="mt-3">
          Podemos alterar funcionalidades, descontinuar recursos ou atualizar estes Termos. Alterações relevantes
          poderão ser comunicadas por meios razoáveis (ex.: aplicativo, e-mail ou aviso no site). O uso continuado após
          a vigência das mudanças poderá constituir aceitação, salvo direito de cancelamento conforme lei.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-[#1C1C1E]">10. Rescisão e exclusão de conta</h2>
        <p className="mt-3">
          Você pode encerrar o uso e solicitar exclusão de conta conforme fluxos no aplicativo e Política de
          Privacidade. Podemos suspender ou encerrar o acesso em caso de violação destes Termos ou exigência legal,
          mediante procedimento proporcional e comunicação quando possível.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-[#1C1C1E]">11. Lei aplicável e foro</h2>
        <p className="mt-3">
          Estes Termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro da comarca do
          domicílio do Usuário para consumidor final, nos termos do CDC; para relações B2B, aplicam-se regras de
          competência conforme contrato e legislação.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-[#1C1C1E]">12. Contato</h2>
        <p className="mt-3">
          Dúvidas sobre estes Termos: utilize os canais em{' '}
          <Link to="/contato" className="font-semibold text-[#007AFF] underline-offset-2 hover:underline">
            Contato
          </Link>
          . Questões sobre dados pessoais: encarregado/DPO conforme{' '}
          <Link to="/privacidade" className="font-semibold text-[#007AFF] underline-offset-2 hover:underline">
            Política de privacidade
          </Link>{' '}
          e página{' '}
          <Link to="/lgpd" className="font-semibold text-[#007AFF] underline-offset-2 hover:underline">
            LGPD
          </Link>
          .
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-[#1C1C1E]">13. Vigência</h2>
        <p className="mt-3">Estes Termos entram em vigor na data indicada no topo desta página e permanecem válidos até substituição.</p>
      </section>
    </PageShell>
  )
}
