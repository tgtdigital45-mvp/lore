import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { supabase } from "@/src/lib/supabase";

const STORAGE_KEY = "aura_offline_mutation_queue_v1";

export type OfflineMutation =
  | { id: string; kind: "vital_log"; patientId: string; row: Record<string, unknown>; createdAt: string }
  | { id: string; kind: "symptom_log"; patientId: string; row: Record<string, unknown>; createdAt: string };

async function readQueue(): Promise<OfflineMutation[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is OfflineMutation => isQueuedItem(x));
  } catch {
    return [];
  }
}

async function writeQueue(items: OfflineMutation[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function isQueuedItem(x: unknown): x is OfflineMutation {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  if (typeof o.id !== "string" || typeof o.kind !== "string" || typeof o.patientId !== "string") return false;
  if (o.kind !== "vital_log" && o.kind !== "symptom_log") return false;
  return typeof o.row === "object" && o.row !== null;
}

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function enqueueOfflineMutation(
  item: Omit<OfflineMutation, "id" | "createdAt">
): Promise<void> {
  const q = await readQueue();
  const next: OfflineMutation = {
    ...item,
    id: newId(),
    createdAt: new Date().toISOString(),
  } as OfflineMutation;
  q.push(next);
  await writeQueue(q);
}

/** Enfileira insert de vital_logs quando não há rede. */
export async function enqueueVitalLog(patientId: string, row: Record<string, unknown>): Promise<void> {
  await enqueueOfflineMutation({ kind: "vital_log", patientId, row });
}

/** Enfileira insert de symptom_logs quando não há rede. */
export async function enqueueSymptomLog(patientId: string, row: Record<string, unknown>): Promise<void> {
  await enqueueOfflineMutation({ kind: "symptom_log", patientId, row });
}

/** Limpa a fila offline (útil para descartar payloads antigos ou testar de novo). */
export async function clearOfflineMutationQueue(): Promise<void> {
  await writeQueue([]);
}

export async function offlineQueueLength(): Promise<number> {
  const q = await readQueue();
  return q.length;
}

/** Reenvia mutações pendentes (chamar quando a app voltar online). */
export async function flushOfflineMutationQueue(): Promise<void> {
  const online = (await NetInfo.fetch()).isConnected;
  if (!online) return;

  let q = await readQueue();
  if (q.length === 0) return;

  const remaining: OfflineMutation[] = [];
  for (const item of q) {
    try {
      if (item.kind === "vital_log") {
        const { error } = await supabase.from("vital_logs").insert(item.row);
        if (error) remaining.push(item);
      } else if (item.kind === "symptom_log") {
        const row = { ...item.row } as Record<string, unknown>;
        const { error } = await supabase.from("symptom_logs").insert(row);
        if (error) remaining.push(item);
      }
    } catch {
      remaining.push(item);
    }
  }
  q = remaining;
  await writeQueue(q);
}
