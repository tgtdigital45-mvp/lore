import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import type { Env } from "./config.js";

export const OCR_INSTRUCTION = `Primeiro classifique o conteúdo (campo document_suitability) antes de extrair dados.
document_suitability:
- "clinical_exam": laudo ou resultado de exame (laboratório, imagem, anatomia patológica), pedido médico com dados clínicos relevantes, ou documento clínico legível a analisar.
- "administrative_insurance": guia de autorização OPME, guia de serviço profissional/convênio (ex.: Unimed), carteirinha só com dados cadastrais, autorização sem resultados laboratoriais — não é resultado de exame.
- "not_medical": selfie ou foto pessoal, paisagem, animal, ecrã aleatório, documento de identidade/CNH sem contexto de exame, imagem ilegível, branco, ou qualquer coisa que não seja documentação clínica ou administrativa de saúde.

Se document_suitability for "not_medical", NÃO invente exames nem valores: use summary_pt_br e confidence_note em português a explicar brevemente por que não é possível analisar (uma ou duas frases); metrics_json deve ser "[]"; markers_json "{}"; exam_date_iso e doctor_name vazios; title_pt_br pode ser vazio ou um título curto como "Imagem não clínica".

Se for "administrative_insurance", descreva em summary_pt_br o tipo de documento (guia, autorização, convênio) sem inventar resultados de laboratório; metrics_json normalmente "[]".

Se for "clinical_exam", siga as regras abaixo.

Regras gerais: não diagnosticar nem recomendar tratamento. Não inclua nome do paciente, número de processo ou identificadores pessoais no texto.
O campo summary_pt_br deve ser uma análise detalhada quando for exame clínico: que exames ou painéis aparecem no documento, principais parâmetros reportados e o que está alterado em relação aos valores de referência do próprio documento (sem inventar referências que não estejam escritas).
Se houver título do exame ou nome do médico no documento, preencha title_pt_br e doctor_name; caso contrário use string vazia.
Se houver data de coleta / realização do exame no documento, preencha exam_date_iso como YYYY-MM-DD; se não houver ou não for legível, use string vazia.
Para hemograma ou painel de sangue, inclua em metrics_json os parâmetros visíveis (ex.: leucócitos, hemoglobina, plaquetas) com name em português claro quando o documento estiver em português.
Para cada biomarcador em metrics_json use: name, value (texto), unit, is_abnormal (true se fora do intervalo explícito no documento), reference_range (texto do intervalo de referência do documento, ex. "4,0-10,0" ou "12-16 g/dL"; vazio se não houver), reference_alert (somente se is_abnormal: frase em pt-BR que CITA o nome do parâmetro, o valor encontrado, se está acima ou abaixo do limite, e o intervalo de referência — ex.: "Leucócitos: 15.000/µL, acima do limite superior; referência no documento: 4.000-11.000/µL."; senão string vazia).
O campo metrics_json deve ser um array JSON serializado em string (pode ser []).
Campo ui_category (obrigatório): escolha UMA categoria para filtros na aplicação móvel:
- "exames": resultados laboratoriais (sangue, urina, bioquímica) ou exames de imagem (TC, RM, US, raio-X, PET, mamografia) — maior volume.
- "laudos": biópsias, anatomopatológico, laudos narrativos médicos detalhados (não painéis numéricos de lab).
- "receitas": prescrições de medicamentos, posologia, receituário.
- "atestados": atestados de afastamento, declarações, guias para convênio/OPME, autorizações administrativas (sem resultado de exame).
- "nutricao": cardápios, planos alimentares, avaliação nutricional, TACO/TACE quando aplicável.

Saída apenas JSON válido conforme o schema.`;

export type OcrMetric = {
  name: string;
  value: string;
  unit: string;
  is_abnormal: boolean;
  reference_alert: string;
  reference_range: string;
};

export type DocumentListCategory = "exames" | "laudos" | "receitas" | "atestados" | "nutricao";

export type OcrStructured = {
  summary_pt_br: string;
  exam_date_iso: string;
  markers: Record<string, unknown>;
  confidence_note: string;
  title_pt_br: string;
  doctor_name: string;
  metrics: OcrMetric[];
  ui_category: DocumentListCategory;
};

export type DocKind = "blood_test" | "biopsy" | "scan";

export type DocumentSuitability = "clinical_exam" | "administrative_insurance" | "not_medical";

export type OcrVisionOutcome = {
  structured: OcrStructured;
  document_kind: DocKind;
  document_suitability: DocumentSuitability;
};

/** Remove cercas ```json … ``` que alguns modelos acrescentam mesmo com responseMimeType JSON. */
function stripModelJsonFence(text: string): string {
  let t = text.trim();
  if (!t.startsWith("```")) return t;
  const firstNl = t.indexOf("\n");
  const lastFence = t.lastIndexOf("```");
  if (firstNl < 0 || lastFence <= firstNl) return t;
  t = t.slice(firstNl + 1, lastFence).trim();
  if (t.toLowerCase().startsWith("json")) t = t.slice(4).trim();
  return t;
}

function resolveUiCategory(
  raw: unknown,
  kind: DocKind,
  suitability: DocumentSuitability
): DocumentListCategory {
  const v = typeof raw === "string" ? raw.trim() : "";
  if (v === "exames" || v === "laudos" || v === "receitas" || v === "atestados" || v === "nutricao") return v;
  if (suitability === "administrative_insurance") return "atestados";
  if (kind === "biopsy") return "laudos";
  if (kind === "blood_test" || kind === "scan") return "exames";
  return "exames";
}

function parseDocumentSuitability(value: unknown): DocumentSuitability {
  const v = typeof value === "string" ? value.trim() : "";
  if (v === "clinical_exam" || v === "administrative_insurance" || v === "not_medical") return v;
  return "clinical_exam";
}

function parseDocKind(value: unknown, hint: DocKind | undefined, suitability: DocumentSuitability): DocKind {
  if (suitability !== "clinical_exam") return "blood_test";
  if (hint) return hint;
  const v = typeof value === "string" ? value.trim() : "";
  if (v === "blood_test" || v === "biopsy" || v === "scan") return v;
  return "blood_test";
}

/** JSON devolvido por Gemini (schema nativo) ou OpenAI (`response_format: json_object`) com o mesmo conteúdo lógico. */
export function parseOcrModelJsonText(
  text: string,
  options: { hintDocumentType?: DocKind; logContext?: string }
): OcrVisionOutcome {
  const hint = options.hintDocumentType;
  const logContext = options.logContext ?? "ocr";
  let raw: {
    summary_pt_br: string;
    exam_date_iso?: string;
    title_pt_br?: string;
    doctor_name?: string;
    markers_json: string;
    metrics_json?: string;
    confidence_note: string;
    document_suitability?: string;
    document_kind?: string;
    ui_category?: string;
  };
  try {
    raw = JSON.parse(stripModelJsonFence(text)) as {
      summary_pt_br: string;
      exam_date_iso?: string;
      title_pt_br?: string;
      doctor_name?: string;
      markers_json: string;
      metrics_json?: string;
      confidence_note: string;
      document_suitability?: string;
      document_kind?: string;
      ui_category?: string;
    };
  } catch (e) {
    console.error(`[ocr] JSON parse failed (${logContext}), snippet:`, text.slice(0, 400));
    throw new Error(`ocr_json_parse: ${e instanceof Error ? e.message : String(e)}`);
  }

  const document_suitability = parseDocumentSuitability(raw.document_suitability);
  const document_kind: DocKind = parseDocKind(raw.document_kind, hint, document_suitability);
  let markers: Record<string, unknown> = {};
  try {
    markers = JSON.parse(typeof raw.markers_json === "string" ? raw.markers_json : "{}") as Record<string, unknown>;
  } catch {
    markers = {};
  }
  let metrics: OcrMetric[] = [];
  try {
    const parsed = JSON.parse(raw.metrics_json ?? "[]") as unknown;
    if (Array.isArray(parsed)) {
      metrics = parsed
        .map((m) => {
          if (!m || typeof m !== "object") return null;
          const o = m as Record<string, unknown>;
          const name = typeof o.name === "string" ? o.name : "";
          const value = typeof o.value === "string" ? o.value : String(o.value ?? "");
          const unit = typeof o.unit === "string" ? o.unit : "";
          const isAb = Boolean(o.is_abnormal);
          const ref =
            typeof o.reference_alert === "string" ? o.reference_alert : String(o.reference_alert ?? "");
          const refRange =
            typeof o.reference_range === "string"
              ? o.reference_range
              : typeof o.referenceRange === "string"
                ? o.referenceRange
                : "";
          if (!name) return null;
          return {
            name,
            value,
            unit,
            is_abnormal: isAb,
            reference_alert: ref,
            reference_range: refRange,
          };
        })
        .filter((x): x is OcrMetric => x !== null);
    }
  } catch {
    metrics = [];
  }
  const ui_category = resolveUiCategory(raw.ui_category, document_kind, document_suitability);
  const structured: OcrStructured = {
    summary_pt_br: raw.summary_pt_br,
    exam_date_iso: typeof raw.exam_date_iso === "string" ? raw.exam_date_iso.trim() : "",
    markers,
    confidence_note: raw.confidence_note,
    title_pt_br: typeof raw.title_pt_br === "string" ? raw.title_pt_br.trim() : "",
    doctor_name: typeof raw.doctor_name === "string" ? raw.doctor_name.trim() : "",
    metrics,
    ui_category,
  };
  return { structured, document_kind, document_suitability };
}

async function runGeminiOcrVisionOnce(
  env: Env,
  modelName: string,
  mimeType: string,
  base64Data: string,
  options?: { hintDocumentType?: DocKind }
): Promise<OcrVisionOutcome> {
  const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: OCR_INSTRUCTION,
    generationConfig: {
      temperature: 0,
      responseMimeType: "application/json",
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          summary_pt_br: { type: SchemaType.STRING },
          exam_date_iso: {
            type: SchemaType.STRING,
            description: "Data do exame ou coleta no documento como YYYY-MM-DD, ou string vazia se ausente",
          },
          title_pt_br: {
            type: SchemaType.STRING,
            description: "Título curto do exame ou laudo em português, se visível no documento",
          },
          doctor_name: {
            type: SchemaType.STRING,
            description: "Nome completo do médico ou responsável se legível; senão string vazia",
          },
          markers_json: {
            type: SchemaType.STRING,
            description: "JSON string com pares nome/valor dos biomarcadores visíveis",
          },
          metrics_json: {
            type: SchemaType.STRING,
            description:
              'Array JSON serializado em string: objetos {name,value,unit,is_abnormal,reference_range,reference_alert}. reference_range = intervalo do documento; reference_alert só se is_abnormal.',
          },
          confidence_note: { type: SchemaType.STRING },
          document_suitability: {
            type: SchemaType.STRING,
            description:
              'Obrigatório. "clinical_exam" = resultado ou laudo clínico; "administrative_insurance" = guia/convênio/autorização sem resultados; "not_medical" = foto pessoal ou conteúdo não clínico.',
          },
          document_kind: {
            type: SchemaType.STRING,
            description:
              'Só para document_suitability "clinical_exam": "blood_test", "biopsy" ou "scan". Se administrative_insurance ou not_medical, use "blood_test" como placeholder.',
          },
          ui_category: {
            type: SchemaType.STRING,
            description:
              'Uma de: exames | laudos | receitas | atestados | nutricao — ver instruções do sistema.',
          },
        },
        required: [
          "summary_pt_br",
          "exam_date_iso",
          "title_pt_br",
          "doctor_name",
          "markers_json",
          "metrics_json",
          "confidence_note",
          "document_suitability",
          "document_kind",
          "ui_category",
        ],
      },
    },
  });

  const hint = options?.hintDocumentType;
  const prompt = hint
    ? `O sistema já indicou o tipo clínico: ${hint}. Se document_suitability for "clinical_exam", o campo document_kind na resposta JSON deve ser exatamente "${hint}". Caso contrário, siga document_suitability. Extraia valores numéricos e unidades quando visíveis. markers_json como objeto JSON em string; metrics_json como array em string.`
    : `Defina primeiro document_suitability. Se for "clinical_exam", document_kind deve ser "blood_test" para laboratório/sangue, "biopsy" para anatomopatológico/biópsia/IHQ, "scan" para laudos de imagem (TC, RM, US, etc.). Guias de convênio/autorização sem resultados: "administrative_insurance". Fotos não clínicas: "not_medical". Preencha ui_category conforme as definições do sistema. markers_json como objeto JSON em string; metrics_json como array em string.`;

  let result;
  try {
    result = await model.generateContent([
      { text: prompt },
      {
        inlineData: {
          mimeType,
          data: base64Data,
        },
      },
    ]);
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e);
    throw new Error(`gemini_request_failed: ${errMsg}`);
  }

  let text: string;
  try {
    text = result.response.text();
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e);
    console.error(`[ocr] Gemini empty/blocked response (model=${modelName}):`, errMsg);
    throw new Error(`gemini_no_text: ${errMsg}`);
  }

  return parseOcrModelJsonText(text, { hintDocumentType: hint, logContext: `gemini:${modelName}` });
}

/** OCR principal: Gemini 3 Flash Preview (`GEMINI_MODEL`). Fallback OpenAI em `runOcrVision`. */
export async function runGeminiOcrVision(
  env: Env,
  mimeType: string,
  base64Data: string,
  options?: { hintDocumentType?: DocKind }
): Promise<OcrVisionOutcome> {
  const modelName = env.GEMINI_MODEL ?? "gemini-3-flash-preview";
  try {
    return await runGeminiOcrVisionOnce(env, modelName, mimeType, base64Data, options);
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    console.error(`[ocr] Gemini generateContent failed (model=${modelName}, mime=${mimeType}):`, err.message);
    throw err;
  }
}
