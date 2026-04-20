-- Regras configuráveis para heurística de risco de suspensão (0–100).
-- Pontos e janelas podem ser ajustados via UPDATE sem redeploy do front.

CREATE TABLE public.heuristic_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  rule_name text NOT NULL UNIQUE,
  condition_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  points integer NOT NULL,
  time_window_hours integer NOT NULL,
  priority integer NOT NULL DEFAULT 0,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.heuristic_rules IS
  'Pontuação e metadados da heurística de risco de suspensão; condição avaliada no cliente (TypeScript).';

CREATE INDEX heuristic_rules_active_priority_idx
  ON public.heuristic_rules (is_active, priority DESC);

ALTER TABLE public.heuristic_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "heuristic_rules_select_authenticated"
  ON public.heuristic_rules FOR SELECT TO authenticated
  USING (true);

INSERT INTO public.heuristic_rules (
  category, rule_name, condition_json, points, time_window_hours, priority, description
) VALUES
  (
    'labs',
    'neutropenic_fever',
    '{"metrics":["Neutrófilos","ANC","Neutrophils"],"operator":"<","value":1000,"requires_fever":true}'::jsonb,
    100,
    24,
    100,
    'Neutropenia febril — suspensão quase certa + risco de vida'
  ),
  (
    'labs',
    'anc_critical',
    '{"metrics":["Neutrófilos","ANC","Neutrophils"],"operator":"<","value":1000}'::jsonb,
    100,
    168,
    90,
    'Neutrófilos absolutos < 1.000/mm³ (último exame até 7 dias)'
  ),
  (
    'labs',
    'platelets_critical',
    '{"metrics":["Plaquetas","Platelets","PLT"],"operator":"<","value":75000}'::jsonb,
    95,
    168,
    80,
    'Plaquetas < 75.000/mm³ — alto risco de hemorragia'
  ),
  (
    'labs',
    'hepatorenal_toxicity',
    '{"metrics":["Creatinina","TGO","TGP","AST","ALT","Bilirrubina Total","Bilirrubina"],"operator":">=","uln_multiplier":3}'::jsonb,
    80,
    168,
    70,
    'Toxicidade hepática/renal ≥ 3× limite superior de referência'
  ),
  (
    'vitals',
    'fever_isolated',
    '{"metric":"temperature","operator":">="}'::jsonb,
    35,
    48,
    50,
    'Febre isolada ≥ limiar hospitalar (48h) — não soma se neutropenia febril'
  ),
  (
    'symptoms',
    'diarrhea_grade3',
    '{"category":"diarrhea","min_grade":3}'::jsonb,
    40,
    72,
    40,
    'Diarreia grau 3 (aprox. CTCAE) — diário recente'
  ),
  (
    'symptoms',
    'mucositis_severe',
    '{"categories":["sore_throat","pain"],"min_grade":3}'::jsonb,
    30,
    72,
    35,
    'Mucosite severa (dor oral/garganta grau elevado ou notas compatíveis)'
  ),
  (
    'symptoms',
    'nausea_refractory',
    '{"categories":["nausea","vomiting"],"min_prd":7,"min_severity":"severe"}'::jsonb,
    28,
    72,
    30,
    'Náusea/vômito intenso (PRD ≥7 ou gravidade severa)'
  ),
  (
    'symptoms',
    'fatigue_extreme',
    '{"category":"fatigue","min_prd":7,"min_grade":3}'::jsonb,
    25,
    72,
    25,
    'Fadiga extrema (PRD ≥7 ou grau ≥3)'
  ),
  (
    'vitals',
    'weight_loss_rapid',
    '{"metric":"weight","pct_loss_threshold":5}'::jsonb,
    20,
    168,
    20,
    'Perda >5% do peso corporal em 7 dias (vitais)'
  )
ON CONFLICT (rule_name) DO NOTHING;
