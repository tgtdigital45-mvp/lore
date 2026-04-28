import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { HeuristicRule } from "@/types/dashboard";

const HEURISTIC_RULES_QUERY_KEY = ["heuristic_rules"] as const;

async function fetchHeuristicRules(): Promise<HeuristicRule[]> {
  const { data, error } = await supabase
    .from("heuristic_rules")
    .select("id, category, rule_name, condition_json, points, time_window_hours, priority, description, is_active")
    .eq("is_active", true)
    .order("priority", { ascending: false });
  if (error) throw error;
  return (data ?? []) as HeuristicRule[];
}

/**
 * Carrega regras heurísticas ativas.
 *
 * Usa TanStack Query com staleTime de 10 minutos: regras mudam raramente
 * e já são buscadas internamente por fetchTriageBundle. Com o cache em
 * memória, chamadas subsequentes (ex: ao abrir o dossier do paciente)
 * retornam imediatamente sem network request adicional.
 */
export function useHeuristicRules() {
  const { data, isLoading, error } = useQuery({
    queryKey: HEURISTIC_RULES_QUERY_KEY,
    queryFn: fetchHeuristicRules,
    staleTime: 10 * 60 * 1000, // 10 min
    gcTime: 30 * 60 * 1000,    // 30 min
  });

  return {
    rules: data ?? [],
    loading: isLoading,
    error: error ? (error as Error).message : null,
  };
}
