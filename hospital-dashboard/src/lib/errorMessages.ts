/**
 * Mensagens amigáveis em pt-BR para erros do PostgREST, Postgres e Edge Functions.
 * Evita expor detalhes internos (tabelas, colunas, políticas) em produção.
 */

const SUPABASE_ERROR_MAP: Record<string, string> = {
  PGRST116: "Dados não encontrados.",
  PGRST301: "Esquema ou recurso não encontrado.",
  PGRST204: "Conteúdo inexistente.",
  "42501": "Acesso não autorizado.",
  "23502": "Faltam dados obrigatórios.",
  "23503": "Referência inválida nos dados.",
  "23505": "Registo duplicado.",
  "23514": "Dados fora dos valores permitidos.",
  "22P02": "Formato de dados inválido.",
  "42P01": "Recurso indisponível.",
  "57014": "Operação cancelada por tempo limite.",
  "08006": "Ligação à base de dados interrompida.",
};

type Pattern = { match: RegExp; pt: string };

const MESSAGE_PATTERNS: Pattern[] = [
  { match: /^jwt expired$/i, pt: "Sessão expirada. Inicie sessão novamente." },
  { match: /invalid jwt/i, pt: "Sessão inválida. Inicie sessão novamente." },
  { match: /invalid refresh token/i, pt: "Sessão inválida. Inicie sessão novamente." },
  { match: /email not confirmed/i, pt: "Confirme o e-mail antes de continuar." },
  { match: /invalid login credentials/i, pt: "E-mail ou senha incorretos." },
  { match: /user (is )?banned/i, pt: "Conta suspensa. Contacte o suporte." },
  { match: /new row violates row-level security/i, pt: "Sem permissão para esta operação." },
  { match: /permission denied/i, pt: "Sem permissão para aceder a estes dados." },
  { match: /violates foreign key constraint/i, pt: "Referência inválida (registo relacionado inexistente)." },
  { match: /duplicate key value violates unique constraint/i, pt: "Já existe um registo com estes dados." },
  { match: /null value in column .+ violates not-null constraint/i, pt: "Preencha todos os campos obrigatórios." },
  { match: /invalid input syntax for (type )?uuid/i, pt: "Identificador inválido." },
  { match: /invalid input syntax for type/i, pt: "Formato de valor inválido." },
  { match: /could not find the table/i, pt: "Recurso não encontrado na base de dados." },
  { match: /column .+ does not exist/i, pt: "Campo não disponível (versão da aplicação desatualizada?)." },
  { match: /JSON object requested.*multiple.*rows returned/i, pt: "Resultado inesperado da consulta." },
  { match: /JSON object requested.*no rows/i, pt: "Nenhum resultado encontrado." },
  { match: /edge function returned a non-2xx status code/i, pt: "O serviço de relatório falhou. Tente novamente ou contacte o suporte." },
  { match: /failed to fetch/i, pt: "Falha de rede. Verifique a ligação à internet." },
  { match: /networkerror/i, pt: "Falha de rede. Verifique a ligação." },
  { match: /load failed/i, pt: "Falha ao carregar dados." },
  { match: /signal is aborted/i, pt: "Pedido cancelado ou tempo esgotado." },
  { match: /the user might not exist/i, pt: "Utilizador não encontrado." },
  { match: /forbidden/i, pt: "Operação não permitida." },
  { match: /unauthorized/i, pt: "Não autorizado. Inicie sessão novamente." },
  { match: /token (has )?expired/i, pt: "Sessão expirada. Inicie sessão novamente." },
  { match: /signup (is )?disabled/i, pt: "Novos registos estão desativados." },
  { match: /email rate limit/i, pt: "Limite de envio de e-mails atingido. Aguarde alguns minutos." },
  { match: /password should be at least/i, pt: "A senha deve cumprir os requisitos mínimos." },
];

/**
 * Traduz mensagens conhecidas em inglês (PostgREST, GoTrue, fetch, Edge Functions).
 */
export function translateRawSupabaseMessage(message: string): string | null {
  const m = message.trim();
  if (!m) return null;
  for (const { match, pt } of MESSAGE_PATTERNS) {
    if (match.test(m)) return pt;
  }
  return null;
}

function looksLikeEnglishUserMessage(s: string): boolean {
  const t = s.toLowerCase();
  return (
    /\b(the|is|are|was|were|invalid|error|failed|denied|permission|constraint|violates|column|table|row)\b/i.test(
      t
    ) && !/á|ã|ç|é|ê|í|ó|ô|õ|ú|à|â/i.test(s)
  );
}

export function sanitizeSupabaseError(err: unknown): string {
  if (err == null) return "Ocorreu um erro inesperado.";
  const e = err as { code?: string; message?: string };
  const msg = (e.message ?? "").trim();
  if (!msg) return "Ocorreu um erro inesperado.";

  const code = e.code ?? "";
  if (code && SUPABASE_ERROR_MAP[code]) return SUPABASE_ERROR_MAP[code];

  const translated = translateRawSupabaseMessage(msg);
  if (translated) return translated;

  if (looksLikeEnglishUserMessage(msg)) {
    return "Ocorreu um erro ao processar os dados. Contacte o suporte se persistir.";
  }

  return msg;
}

/** Para blocos catch: usa sanitize e, se genérico, aplica mensagem de contexto em pt-BR. */
export function userFacingApiError(err: unknown, contextFallback: string): string {
  const generic =
    "Ocorreu um erro ao processar os dados. Contacte o suporte se persistir.";
  const s = sanitizeSupabaseError(err);
  if (s === generic) return contextFallback;
  if (s === "Ocorreu um erro inesperado.") return contextFallback;
  return s;
}

/** Mensagem vinda de JSON de API HTTP (pode estar em inglês). */
export function sanitizeHttpApiMessage(raw: string | undefined | null, fallbackPt: string): string {
  const m = (raw ?? "").trim();
  if (!m) return fallbackPt;
  const s = sanitizeSupabaseError({ message: m });
  const generic =
    "Ocorreu um erro ao processar os dados. Contacte o suporte se persistir.";
  if (s === generic || s === "Ocorreu um erro inesperado.") return fallbackPt;
  return s;
}
