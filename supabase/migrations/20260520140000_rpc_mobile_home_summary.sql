-- Resumo mobile: uma RPC devolve o mesmo bundle que fetchHomeSummarySnapshot (paralelo).
-- SECURITY INVOKER: RLS das tabelas base aplica-se ao utilizador autenticado (paciente/cuidador com acesso).

CREATE OR REPLACE FUNCTION public.rpc_norm_biomarker_key(c text)
RETURNS text
LANGUAGE sql
IMMUTABLE
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

CREATE OR REPLACE FUNCTION public.rpc_mobile_home_summary(p_patient_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $fn$
DECLARE
  uid uuid := auth.uid();
  profile_name text := '';
  profile_avatar text;
  now_iso timestamptz := now();
  active_cycle jsonb;
  biomarker_entries jsonb := '[]'::jsonb;
  symptom_entries jsonb := '[]'::jsonb;
  vital_entries jsonb := '[]'::jsonb;
  nutrition_rows jsonb := '[]'::jsonb;
  has_biopsy boolean := false;
  last_doc jsonb;
  latest_symptom jsonb;
  next_appt jsonb;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT coalesce(p.full_name, ''), p.avatar_url
  INTO profile_name, profile_avatar
  FROM public.profiles p
  WHERE p.id = uid;

  SELECT to_jsonb(tc) - 'patient_id'
  INTO active_cycle
  FROM public.treatment_cycles tc
  WHERE tc.patient_id = p_patient_id
    AND tc.status = 'active'
  ORDER BY tc.start_date DESC
  LIMIT 1;

  biomarker_entries := coalesce(
    (
      WITH bio_ordered AS (
        SELECT
          bl.name,
          bl.value_numeric,
          bl.value_text,
          bl.unit,
          bl.logged_at,
          public.rpc_norm_biomarker_key(public.canonical_biomarker_name_sql(bl.name)) AS nk,
          public.canonical_biomarker_name_sql(bl.name) AS canon
        FROM public.biomarker_logs bl
        WHERE bl.patient_id = p_patient_id
        ORDER BY bl.logged_at DESC
        LIMIT 400
      ),
      bio_disp AS (
        SELECT
          *,
          CASE
            WHEN value_numeric IS NOT NULL THEN trim(both ' ' FROM to_char(value_numeric, 'FM9999999999999999990.##############'))
            WHEN value_text IS NOT NULL AND btrim(value_text) <> '' THEN btrim(value_text)
            ELSE NULL::text
          END AS disp
        FROM bio_ordered
      ),
      bio_pick AS (
        SELECT DISTINCT ON (nk)
          nk,
          canon,
          disp,
          unit,
          logged_at
        FROM bio_disp
        WHERE disp IS NOT NULL AND disp <> ''
        ORDER BY nk, logged_at DESC
      )
      SELECT coalesce(
        jsonb_agg(
          jsonb_build_array(
            nk,
            jsonb_build_object(
              'name', canon,
              'value', disp,
              'unit', unit,
              'logged_at', to_char(logged_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
            )
          )
          ORDER BY logged_at DESC
        ),
        '[]'::jsonb
      )
      FROM bio_pick
    ),
    '[]'::jsonb
  );

  symptom_entries := coalesce(
    (
      WITH sym_pick AS (
        SELECT DISTINCT ON (symptom_category)
          id,
          entry_kind,
          symptom_category,
          severity::text,
          pain_level,
          nausea_level,
          fatigue_level,
          body_temperature,
          logged_at
        FROM public.symptom_logs sl
        WHERE sl.patient_id = p_patient_id
          AND sl.symptom_category IS NOT NULL
          AND btrim(sl.symptom_category) <> ''
        ORDER BY sl.symptom_category, sl.logged_at DESC
      )
      SELECT coalesce(
        jsonb_agg(
          jsonb_build_array(
            symptom_category,
            jsonb_build_object(
              'id', id::text,
              'entry_kind', entry_kind,
              'symptom_category', symptom_category,
              'severity', severity,
              'pain_level', pain_level,
              'nausea_level', nausea_level,
              'fatigue_level', fatigue_level,
              'body_temperature', body_temperature,
              'logged_at', to_char(logged_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
            )
          )
        ),
        '[]'::jsonb
      )
      FROM sym_pick
    ),
    '[]'::jsonb
  );

  vital_entries := coalesce(
    (
      WITH v_pick AS (
        SELECT DISTINCT ON (vital_type)
          vl.*
        FROM public.vital_logs vl
        WHERE vl.patient_id = p_patient_id
        ORDER BY vl.vital_type, vl.logged_at DESC
      )
      SELECT coalesce(
        jsonb_agg(
          jsonb_build_array(
            vital_type,
            jsonb_build_object(
              'id', id::text,
              'patient_id', patient_id::text,
              'logged_at', to_char(logged_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
              'vital_type', vital_type,
              'value_numeric', value_numeric,
              'value_systolic', value_systolic,
              'value_diastolic', value_diastolic,
              'unit', unit,
              'notes', notes,
              'created_at', to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
              'updated_at', to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
            )
          )
        ),
        '[]'::jsonb
      )
      FROM v_pick
    ),
    '[]'::jsonb
  );

  SELECT coalesce(
    jsonb_agg(
      to_jsonb(nl) || jsonb_build_object(
        'logged_at', to_char(nl.logged_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
        'created_at', to_char(nl.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
      )
      ORDER BY nl.logged_at DESC
    ),
    '[]'::jsonb
  )
  INTO nutrition_rows
  FROM (
    SELECT *
    FROM public.nutrition_logs nl
    WHERE nl.patient_id = p_patient_id
    ORDER BY nl.logged_at DESC
    LIMIT 500
  ) nl;

  SELECT EXISTS (
    SELECT 1
    FROM public.medical_documents md
    WHERE md.patient_id = p_patient_id
      AND md.document_type = 'biopsy'
    LIMIT 1
  )
  INTO has_biopsy;

  SELECT jsonb_build_object(
    'document_type', md.document_type::text,
    'uploaded_at', to_char(md.uploaded_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  )
  INTO last_doc
  FROM public.medical_documents md
  WHERE md.patient_id = p_patient_id
  ORDER BY md.uploaded_at DESC
  LIMIT 1;

  SELECT jsonb_build_object(
    'id', sl.id::text,
    'entry_kind', sl.entry_kind,
    'symptom_category', sl.symptom_category,
    'severity', sl.severity::text,
    'pain_level', sl.pain_level,
    'nausea_level', sl.nausea_level,
    'fatigue_level', sl.fatigue_level,
    'body_temperature', sl.body_temperature,
    'logged_at', to_char(sl.logged_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  )
  INTO latest_symptom
  FROM public.symptom_logs sl
  WHERE sl.patient_id = p_patient_id
  ORDER BY sl.logged_at DESC
  LIMIT 1;

  SELECT jsonb_build_object(
    'title', pa.title,
    'starts_at', to_char(pa.starts_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'kind', pa.kind::text
  )
  INTO next_appt
  FROM public.patient_appointments pa
  WHERE pa.patient_id = p_patient_id
    AND pa.starts_at >= now_iso
    AND pa.kind IN ('consult', 'exam', 'other', 'infusion')
  ORDER BY pa.starts_at ASC
  LIMIT 1;

  RETURN jsonb_build_object(
    'profileName', profile_name,
    'profileAvatarUrl', profile_avatar,
    'activeCycle', active_cycle,
    'biomarkerByNormEntries', biomarker_entries,
    'lastBySymptomEntries', symptom_entries,
    'latestVitalByTypeEntries', vital_entries,
    'nutritionRows', nutrition_rows,
    'hasBiopsy', has_biopsy,
    'lastDoc', last_doc,
    'latestSymptom', latest_symptom,
    'nextAppointment', next_appt
  );
END;
$fn$;

REVOKE ALL ON FUNCTION public.rpc_mobile_home_summary(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_mobile_home_summary(uuid) TO authenticated;

COMMENT ON FUNCTION public.rpc_mobile_home_summary(uuid) IS
  'Bundle JSON do ecrã Resumo (mobile); alinhado a fetchHomeSummarySnapshot.';

REVOKE ALL ON FUNCTION public.rpc_norm_biomarker_key(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.canonical_biomarker_name_sql(text) FROM PUBLIC;

DROP FUNCTION IF EXISTS public.rpc_mobile_home_summary_ping(uuid);
