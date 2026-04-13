# Checklist — DPA e SLA (para elaboração com assessoria jurídica)

Use este checklist na negociação com cooperativa / operadora. Marque cada item com o estado (pendente / acordado / N/A).

---

## A. Acordo de processamento de dados (DPA / contrato de encomenda)

| # | Tópico | Notas |
|---|--------|-------|
| A1 | Identificação das partes (controladora / operadora) e vigência | |
| A2 | Descrição das categorias de dados pessoais e titulares | Ver inventário no RIPD sumário |
| A3 | Instruções documentadas e finalidades permitidas | Sem finalidades incompatíveis com o produto |
| A4 | Confidencialidade do pessoal com acesso | |
| A5 | Suboperadores: lista, notificação prévia, cláusulas equivalentes | Supabase, cloud, LLM, R2, Meta, etc. |
| A6 | Transferências internacionais e garantias (arts. 33–36 LGPD) | Documentar EEAs e cláusulas contratuais |
| A7 | Medidas técnicas e organizativas (segurança) | TLS, RLS, backups, gestão de segredos |
| A8 | Assistência à resposta a titulares e à ANPD | Prazos e canais |
| A9 | Eliminação ou devolução dos dados ao termo do contrato | Retenção conforme lei e backup |
| A10 | Auditoria / comprovação de compliance | Frequência e aviso prévio |
| A11 | Responsabilidade e limites (sem prejuízo de cláusulas obrigatórias) | |
| A12 | Incidentes de segurança: notificação à controladora em prazo acordado | |

---

## B. SLA (nível de serviço)

| # | Métrica | Exemplo de mercado | A definir com SRE |
|---|---------|--------------------|-------------------|
| B1 | Disponibilidade mensal do serviço SaaS | Ex.: 99,5% ou 99,9% | Excluir janelas de manutenção programada? |
| B2 | Manutenção programada | Janela e aviso prévio (ex.: 48 h) | |
| B3 | Suporte: canais (e-mail, portal) e horário | 24x7 vs horário comercial | |
| B4 | Tempos de primeira resposta por severidade | SEV1–SEV4 | |
| B5 | Tempo de recuperação (RTO) e objetivo de ponto de recuperação (RPO) | Depende de backup do Supabase |
| B6 | Incidente de segurança: comunicação à controladora | Prazo em horas úteis | |
| B7 | Créditos ou remediação por incumprimento | Conforme política comercial | |

**Nota:** SLA realista depende dos SLAs dos fornecedores (Supabase, hospedagem do backend, etc.) e de monitorização (status page, alertas).

---

## C. Termos B2B2C (paciente)

| # | Tópico |
|---|--------|
| C1 | Consentimento explícito para partilha com operadora / rede contratada |
| C2 | Base legal para cada tipo de dado |
| C3 | Direitos do titular e como exercê-los |
| C4 | Retenção e exclusão |
| C5 | Responsável pelo conteúdo educativo validado pela operadora (se aplicável) |

---

*Última actualização: documentação de projeto Aura Onco — revisar antes de assinatura.*
