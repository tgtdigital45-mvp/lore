Políticas de Segurança e Compliance (RLS)
Documento: supabase-policies.md
Motor: PostgreSQL (Supabase Row Level Security)
Objetivo: Estabelecer a matriz de acesso aos dados para garantir total conformidade com a LGPD (Lei Geral de Proteção de Dados) e HIPAA, utilizando controle de acesso baseado em funções (RBAC) e dono do dado.
1. Fundamentos de Segurança (O Padrão HIPAA/LGPD)
O ecossistema Onco adota o princípio do Privilégio Mínimo (Least Privilege).
O Backend (API) não tem acesso "root" indiscriminado aos dados.
Cada requisição ao banco de dados passa pela engine do PostgreSQL validando o token JWT do usuário ativo através da função auth.uid().
Regra de Ouro: Todas as tabelas públicas (public.*) devem ter o RLS ativado (ALTER TABLE nome_da_tabela ENABLE ROW LEVEL SECURITY;). Sem uma política explícita de SELECT, o banco retorna zero linhas.
2. Matriz de Acesso por Perfil (RBAC - Role Based Access Control)
Conforme definido no supabase-schema.md, temos 4 roles (papéis) primárias, que geram as seguintes premissas de acesso:
Tabela / Domínio	patient (Paciente)	caregiver (Cuidador)	doctor / nurse (Hospital)
Seu Próprio Perfil	Leitura / Edição	Leitura / Edição	Leitura / Edição
Prontuário (patients)	Leitura Apenas	Leitura Apenas (se autorizado)	Leitura / Edição (se vinculado)
Diário Sintomas (symptom_logs)	Inserção / Leitura	Leitura Apenas	Leitura Apenas
Documentos (medical_documents)	Inserção / Leitura	Sem Acesso (Padrão)	Leitura Apenas
Ciclos (treatment_cycles)	Leitura Apenas	Leitura Apenas	Inserção / Edição / Leitura
3. Implementação SQL das Políticas (RLS Policies)
Abaixo estão os exemplos práticos de como a segurança é programada diretamente no motor do banco de dados, tornando impossível o vazamento horizontal de dados (ex: um paciente acessar o ID de outro paciente).
3.1. Proteção de Perfis (profiles)
Um usuário só pode ler e atualizar seu próprio perfil. Médicos podem ler os perfis dos pacientes atrelados ao seu hospital.
-- Ativar RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Política 1: O usuário é dono do próprio perfil
CREATE POLICY "Users can view own profile" 
ON profiles FOR SELECT 
USING ( auth.uid() = id );

CREATE POLICY "Users can update own profile" 
ON profiles FOR UPDATE 
USING ( auth.uid() = id );

-- Política 2: Médicos leem perfis de pacientes do seu hospital (Requer função auxiliar)
CREATE POLICY "Medical staff can view hospital patients"
ON profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM patients p
    WHERE p.profile_id = profiles.id
    AND p.hospital_id IN (SELECT hospital_id FROM staff_assignments WHERE staff_id = auth.uid())
  )
);

3.2. Proteção de Sintomas (symptom_logs)
Esta tabela contém dados ultrassensíveis em tempo real. O paciente insere seus dados, mas não pode apagá-los (garantia de auditoria médica).
ALTER TABLE symptom_logs ENABLE ROW LEVEL SECURITY;

-- Política 1: Paciente insere e lê seus próprios logs
CREATE POLICY "Patients can insert own symptoms" 
ON symptom_logs FOR INSERT 
WITH CHECK ( auth.uid() IN (SELECT profile_id FROM patients WHERE id = symptom_logs.patient_id) );

CREATE POLICY "Patients can view own symptoms" 
ON symptom_logs FOR SELECT 
USING ( auth.uid() IN (SELECT profile_id FROM patients WHERE id = symptom_logs.patient_id) );

-- Política 2: Médicos/Enfermeiros vinculados podem ler
CREATE POLICY "Hospital staff can view patient symptoms"
ON symptom_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM patients p
    WHERE p.id = symptom_logs.patient_id
    AND p.hospital_id IN (SELECT hospital_id FROM staff_assignments WHERE staff_id = auth.uid())
  )
);

3.3. Proteção de Documentos Físicos (Supabase Storage)
Exames em PDF ou Imagens (Buckets) precisam de segurança em nível de URL. Não utilizamos URLs públicas (public URL), apenas URLs assinadas (Signed URLs) válidas por tempo limitado (ex: 60 segundos).
-- O Bucket "medical_scans" não é público.
-- Política RLS no Storage para garantir que apenas o dono do exame possa fazer o download.
CREATE POLICY "Restrict Scan Downloads"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'medical_scans' AND 
  (auth.uid() = owner) -- O owner é gravado automaticamente pelo Supabase Auth no momento do upload
);

4. Auditoria de Acessos (Compliance HIPAA)
Para cumprir com a HIPAA, todo acesso aos prontuários médicos (patients e symptom_logs) por parte da equipe do hospital deve ser auditado (Saber quem leu, e quando).
Abordagem Técnica: Utilização da extensão pgaudit do PostgreSQL ou uma Trigger (Gatilho) padrão.
Mecanismo: Sempre que a role doctor ou nurse fizer um SELECT em uma linha de um paciente, o Supabase dispara uma Trigger inserindo um registro na tabela audit_logs:
timestamp: Momento exato da leitura.
actor_id: UUID do médico/enfermeiro.
target_patient_id: UUID do paciente visualizado.
action_type: "VIEW_SYMPTOMS" ou "VIEW_PROFILE".