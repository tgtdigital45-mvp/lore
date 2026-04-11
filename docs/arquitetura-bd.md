Arquitetura de Banco de Dados (Supabase / PostgreSQL)
Documento: supabase-schema.md
Objetivo: Definir a estrutura relacional de alta performance e as lógicas de armazenamento dos dados clínicos.
1. Topologia do Banco
Optamos por um banco de dados relacional altamente normalizado, essencial para garantir a integridade dos dados de saúde. O Supabase fornece o PostgreSQL como motor principal.
2. Tipos Customizados (Enums)
O PostgreSQL permite criar tipos rígidos para evitar strings inválidas no banco:
CREATE TYPE user_role AS ENUM ('patient', 'caregiver', 'doctor', 'nurse', 'hospital_admin');
CREATE TYPE cancer_type AS ENUM ('breast', 'lung', 'prostate', 'leukemia', 'colorectal', 'other');
CREATE TYPE symptom_severity AS ENUM ('mild', 'moderate', 'severe', 'life_threatening');

3. Entidades Principais (Tabelas)
3.1. Tabela profiles (Usuários)
Extensão da tabela padrão de autenticação do Supabase (auth.users).
id (UUID, PK, FK -> auth.users.id)
role (user_role)
full_name (Text)
date_of_birth (Date)
created_at (Timestampz)
3.2. Tabela patients (Prontuário Master)
Contém os dados clínicos base, vinculados ao perfil do paciente.
id (UUID, PK)
profile_id (UUID, FK -> profiles.id)
primary_cancer_type (cancer_type)
current_stage (Text - ex: "Stage III")
hospital_id (UUID, FK -> hospitais parceiros)
is_in_nadir (Boolean) - Lógica: Flag calculada via trigger para ativar o modo de emergência imunológica.
3.3. Tabela treatment_cycles (Lógica de Tratamento)
Armazena a linha do tempo do paciente.
id (UUID, PK)
patient_id (UUID, FK -> patients.id)
protocol_name (Text - ex: "AC-T", "FOLFOX")
start_date (Date)
end_date (Date)
status (Enum: 'active', 'completed', 'suspended')
3.4. Tabela symptom_logs (O Motor do Mapa de Calor)
Esta tabela gera os dados para os gráficos do App e os alertas para o Hospital.
id (UUID, PK)
patient_id (UUID, FK -> patients.id)
cycle_id (UUID, FK -> treatment_cycles.id)
symptom_category (Text - ex: "nausea", "fever", "fatigue", "diarrhea")
severity (symptom_severity)
body_temperature (Decimal - preenchido se a categoria for 'fever')
logged_at (Timestampz)
requires_action (Boolean) - Lógica: Se severity = 'severe', marca TRUE para o dashboard do hospital.
3.5. Tabela medical_documents (OCR e Laudos)
Armazena os metadados dos exames processados pela IA. Os arquivos físicos (PDFs/Imagens) ficam no Supabase Storage.
id (UUID, PK)
patient_id (UUID, FK -> patients.id)
storage_path (Text)
document_type (Enum: 'blood_test', 'biopsy', 'scan')
ai_extracted_json (JSONB) - Lógica: Armazena o JSON estruturado que a IA devolveu (ex: { "leukocytes": 3500, "platelets": 120000 }) para plotar os gráficos de forma rápida.
uploaded_at (Timestampz)