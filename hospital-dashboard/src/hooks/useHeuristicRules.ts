import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { HeuristicRule } from "@/types/dashboard";

/**
 * Carrega regras ativas de `heuristic_rules` (pontos / janelas configuráveis no banco).
 */
export function useHeuristicRules() {
  const [rules, setRules] = useState<HeuristicRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      const { data, error: qErr } = await supabase
        .from("heuristic_rules")
        .select("id, category, rule_name, condition_json, points, time_window_hours, priority, description, is_active")
        .eq("is_active", true)
        .order("priority", { ascending: false });
      if (cancelled) return;
      if (qErr) {
        setError(qErr.message);
        setRules([]);
      } else {
        setRules((data ?? []) as HeuristicRule[]);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { rules, loading, error };
}
