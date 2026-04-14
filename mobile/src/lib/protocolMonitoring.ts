import type { SupabaseClient } from "@supabase/supabase-js";
import type { MonitoringGuideline, ProtocolWithGuidelines } from "@/src/types/protocolMonitoring";

export async function fetchProtocolWithGuidelines(
  client: SupabaseClient,
  protocolId: string
): Promise<ProtocolWithGuidelines | null> {
  const { data: proto, error: e1 } = await client
    .from("protocols")
    .select("id, name, duration_weeks")
    .eq("id", protocolId)
    .maybeSingle();
  if (e1 || !proto) return null;
  const { data: guides, error: e2 } = await client
    .from("monitoring_guidelines")
    .select("*")
    .eq("protocol_id", protocolId)
    .order("sort_order", { ascending: true });
  if (e2) {
    console.warn("[fetchProtocolWithGuidelines]", e2.message);
    return null;
  }
  const p = proto as { id: string; name: string; duration_weeks: number };
  return {
    id: p.id,
    name: p.name,
    duration_weeks: Number(p.duration_weeks),
    guidelines: (guides ?? []) as MonitoringGuideline[],
  };
}

/** Primeiro protocolo associado ao tipo de câncer no catálogo (ordem implícita). */
export async function resolveFirstProtocolIdForCancerType(
  client: SupabaseClient,
  cancerTypeId: string
): Promise<string | null> {
  const { data, error } = await client
    .from("cancer_protocols")
    .select("protocol_id")
    .eq("cancer_type_id", cancerTypeId)
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return typeof (data as { protocol_id?: string }).protocol_id === "string"
    ? (data as { protocol_id: string }).protocol_id
    : null;
}
