-- rpc_mobile_home_summary (later migrations) may reference these helpers; ensure they exist
-- and that authenticated can execute them (earlier migration revoked PUBLIC but omitted GRANT).

CREATE OR REPLACE FUNCTION public.rpc_norm_biomarker_key(c text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT regexp_replace(
    lower(
      translate(
        btrim(c),
        'áàâãäåéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÅÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ',
        'aaaaaaeeeeiiiiooooouuuuncnaaaaaaeeeeiiiiooooouuuuncn'
      )
    ),
    '\s+',
    '',
    'g'
  );
$$;

CREATE OR REPLACE FUNCTION public.canonical_biomarker_name_sql(raw text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $c$
DECLARE
  t text;
BEGIN
  t := btrim(coalesce(raw, ''));
  IF t = '' THEN
    RETURN t;
  END IF;
  IF t ~* '(white\s*blood\s*cells?|leuc[oó]citos?|leukocytes?|\bwbc\b)' THEN
    RETURN 'Leucócitos';
  END IF;
  IF t ~* '(hemoglobina|hemoglobin|\bhgb\b)' THEN
    RETURN 'Hemoglobina';
  END IF;
  IF t ~* '(hemat[oó]crito|hematocrit|\bhct\b|\bht\b)' THEN
    RETURN 'Hematócrito';
  END IF;
  IF t ~* '(plaquetas?|platelets?|\bplt\b|thrombocytes?)' THEN
    RETURN 'Plaquetas';
  END IF;
  IF t ~* '\b(vcm|mcv|mean\s*corpuscular\s*volume)\b' THEN
    RETURN 'VCM';
  END IF;
  IF t ~* '\b(hcm|mch|mean\s*corpuscular\s*hemoglobin)\b' THEN
    RETURN 'HCM';
  END IF;
  IF t ~* '\b(chcm|mchc)\b' THEN
    RETURN 'CHCM';
  END IF;
  IF t ~* '(rod(?:\s|$)|neutr[oó]filos?|neutrophils?|\bneu\b)' THEN
    RETURN 'Neutrófilos';
  END IF;
  IF t ~* '(lymphocytes?|linf[oó]citos?)' THEN
    RETURN 'Linfócitos';
  END IF;
  IF t ~* '(monocytes?|mon[oó]citos?)' THEN
    RETURN 'Monócitos';
  END IF;
  IF t ~* '(eosinophils?|eosin[oó]filos?)' THEN
    RETURN 'Eosinófilos';
  END IF;
  IF t ~* '(basophils?|bas[oó]filos?)' THEN
    RETURN 'Basófilos';
  END IF;
  IF t ~* '(ferritin[a]?|ferritina)\b' THEN
    RETURN 'Ferritina';
  END IF;
  IF t ~* '(ferro\s*s[eé]rico|serum\s*iron)\b' THEN
    RETURN 'Ferro sérico';
  END IF;
  IF t ~* '(cr[eé]atinina|creatinine)\b' THEN
    RETURN 'Creatinina';
  END IF;
  IF t ~* '(ureia|urea|bun)\b' THEN
    RETURN 'Ureia';
  END IF;
  RETURN t;
END;
$c$;

REVOKE ALL ON FUNCTION public.rpc_norm_biomarker_key(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.canonical_biomarker_name_sql(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_norm_biomarker_key(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.canonical_biomarker_name_sql(text) TO authenticated;
