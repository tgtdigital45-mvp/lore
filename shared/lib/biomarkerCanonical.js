/** Alinha nomes vindos da IA (EN/abrev.) aos rótulos usados nos widgets e gráficos (pt-BR). */
const RULES = [
    { re: /\b(white\s*blood\s*cells?|leuc[oó]citos?|leukocytes?|\bwbc\b)/i, canonical: "Leucócitos" },
    { re: /\b(hemoglobina|hemoglobin|\bhgb\b)/i, canonical: "Hemoglobina" },
    { re: /\b(hemat[oó]crito|hematocrit|\bhct\b|\bht\b)/i, canonical: "Hematócrito" },
    { re: /\b(plaquetas?|platelets?|\bplt\b|thrombocytes?)/i, canonical: "Plaquetas" },
    { re: /\b(vcm|mcv|mean\s*corpuscular\s*volume)\b/i, canonical: "VCM" },
    { re: /\b(hcm|mch|mean\s*corpuscular\s*hemoglobin)\b/i, canonical: "HCM" },
    { re: /\b(chcm|mchc)\b/i, canonical: "CHCM" },
    { re: /\b(rod(?:\s|$)|neutr[oó]filos?|neutrophils?|\bneu\b)/i, canonical: "Neutrófilos" },
    { re: /\b(lymphocytes?|linf[oó]citos?)/i, canonical: "Linfócitos" },
    { re: /\b(monocytes?|mon[oó]citos?)/i, canonical: "Monócitos" },
    { re: /\b(eosinophils?|eosin[oó]filos?)/i, canonical: "Eosinófilos" },
    { re: /\b(basophils?|bas[oó]filos?)/i, canonical: "Basófilos" },
    { re: /\b(ferritin[a]?|ferritina)\b/i, canonical: "Ferritina" },
    { re: /\b(ferro\s*s[eé]rico|serum\s*iron)\b/i, canonical: "Ferro sérico" },
    { re: /\b(cr[eé]atinina|creatinine)\b/i, canonical: "Creatinina" },
    { re: /\b(ureia|urea|bun)\b/i, canonical: "Ureia" },
];
export function canonicalBiomarkerName(raw) {
    const t = raw.trim();
    if (!t)
        return t;
    for (const { re, canonical } of RULES) {
        if (re.test(t))
            return canonical;
    }
    return t;
}
/**
 * Converte texto de resultado de laboratório (pt-BR ou en) em número.
 * Ex.: "15.000", "12,5", "4.500", "3,45" / "1.234,56".
 */
export function parseLabNumericString(value) {
    const raw = String(value ?? "").trim();
    if (!raw)
        return null;
    const cleaned = raw.replace(/[^\d,.\-\s]/g, "").replace(/\s/g, "");
    if (!cleaned || cleaned === "-")
        return null;
    let s = cleaned;
    const hasComma = s.includes(",");
    const hasDot = s.includes(".");
    if (hasComma && (!hasDot || s.lastIndexOf(",") > s.lastIndexOf("."))) {
        s = s.replace(/\./g, "").replace(",", ".");
    }
    else if (hasComma && hasDot) {
        s = s.replace(/,/g, "");
    }
    else if (hasComma && !hasDot) {
        s = s.replace(",", ".");
    }
    else if (hasDot) {
        const parts = s.split(".");
        if (parts.length === 2) {
            const [a, b] = parts;
            if (b && b.length === 3 && /^[0-9]{1,3}$/.test(a ?? "") && /^[0-9]{3}$/.test(b)) {
                s = `${a}${b}`;
            }
        }
        else if (parts.length > 2) {
            s = s.replace(/\./g, "");
        }
    }
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : null;
}
