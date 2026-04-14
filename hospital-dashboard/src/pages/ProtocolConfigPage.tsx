import { useCallback, useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import { useOncoCare } from "@/context/OncoCareContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
  MedicationReferenceRow,
  ProtocolAlertRuleRow,
  ProtocolGuidelineWindowRow,
  ProtocolMedicationWatchRow,
} from "../../../shared/protocolAlertAnchors";

type ProtocolRow = { id: string; name: string; duration_weeks: number };
type GuidelineRow = { id: string; title: string; category: string };

const ANCHORS: { value: ProtocolGuidelineWindowRow["time_anchor"]; label: string }[] = [
  { value: "from_cycle_start", label: "Desde início do ciclo" },
  { value: "from_last_infusion", label: "Desde última infusão" },
];

const METRICS: { value: ProtocolAlertRuleRow["metric_kind"]; label: string }[] = [
  { value: "body_temperature", label: "Temperatura corporal" },
  { value: "lab_platelets", label: "Plaquetas (lab)" },
  { value: "symptom_severity", label: "Gravidade do sintoma" },
  { value: "custom", label: "Personalizado" },
];

const SEVERITY: { value: string; label: string }[] = [
  { value: "low", label: "Baixa" },
  { value: "medium", label: "Média" },
  { value: "high", label: "Alta" },
  { value: "critical", label: "Crítica" },
];

function selectClass() {
  return "mt-1 flex h-11 w-full rounded-2xl border-[3px] border-[#F3F4F6] bg-white px-3 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-[#1A1A1A]";
}

export function ProtocolConfigPage() {
  const { staffProfile } = useOncoCare();
  const isAdmin = staffProfile?.role === "hospital_admin";

  const [protocols, setProtocols] = useState<ProtocolRow[]>([]);
  const [protocolId, setProtocolId] = useState<string>("");
  const [guidelines, setGuidelines] = useState<GuidelineRow[]>([]);
  const [windows, setWindows] = useState<ProtocolGuidelineWindowRow[]>([]);
  const [rules, setRules] = useState<ProtocolAlertRuleRow[]>([]);
  const [refs, setRefs] = useState<MedicationReferenceRow[]>([]);
  const [watches, setWatches] = useState<ProtocolMedicationWatchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadProtocols = useCallback(async () => {
    const { data, error } = await supabase.from("protocols").select("id, name, duration_weeks").order("name");
    if (error) throw error;
    setProtocols((data ?? []) as ProtocolRow[]);
  }, []);

  const reloadProtocolData = useCallback(async (pid: string) => {
    if (!pid) {
      setGuidelines([]);
      setWindows([]);
      setRules([]);
      setWatches([]);
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      const [g, w, r, refList, watch] = await Promise.all([
        supabase.from("monitoring_guidelines").select("id, title, category").eq("protocol_id", pid).order("sort_order"),
        supabase.from("protocol_guideline_windows").select("*").eq("protocol_id", pid).order("priority", { ascending: false }),
        supabase.from("protocol_alert_rules").select("*").eq("protocol_id", pid).order("sort_order"),
        supabase.from("medication_reference").select("*").order("canonical_name"),
        supabase.from("protocol_medication_watch").select("*").eq("protocol_id", pid).order("priority", { ascending: false }),
      ]);
      if (g.error) throw g.error;
      if (w.error) throw w.error;
      if (r.error) throw r.error;
      if (refList.error) throw refList.error;
      if (watch.error) throw watch.error;
      setGuidelines((g.data ?? []) as GuidelineRow[]);
      setWindows((w.data ?? []) as ProtocolGuidelineWindowRow[]);
      setRules((r.data ?? []) as ProtocolAlertRuleRow[]);
      setRefs((refList.data ?? []) as MedicationReferenceRow[]);
      setWatches((watch.data ?? []) as ProtocolMedicationWatchRow[]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProtocols();
  }, [loadProtocols]);

  useEffect(() => {
    if (protocolId) void reloadProtocolData(protocolId);
  }, [protocolId, reloadProtocolData]);

  useEffect(() => {
    if (!protocolId && protocols.length > 0) setProtocolId(protocols[0].id);
  }, [protocols, protocolId]);

  async function addWindow(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!protocolId || !isAdmin) return;
    const fd = new FormData(e.currentTarget);
    const guideline_id = String(fd.get("guideline_id") ?? "");
    const time_anchor = String(fd.get("time_anchor") ?? "from_cycle_start") as ProtocolGuidelineWindowRow["time_anchor"];
    const day_offset_min = Number(fd.get("day_offset_min") ?? 0);
    const maxRaw = String(fd.get("day_offset_max") ?? "").trim();
    const day_offset_max = maxRaw === "" ? null : Number(maxRaw);
    const priority = Number(fd.get("priority") ?? 0);
    const { error } = await supabase.from("protocol_guideline_windows").insert({
      protocol_id: protocolId,
      guideline_id,
      time_anchor,
      day_offset_min,
      day_offset_max,
      priority,
    });
    if (error) {
      setErr(error.message);
      return;
    }
    e.currentTarget.reset();
    void reloadProtocolData(protocolId);
  }

  async function deleteWindow(id: string) {
    if (!isAdmin) return;
    setBusy(true);
    const { error } = await supabase.from("protocol_guideline_windows").delete().eq("id", id);
    setBusy(false);
    if (error) setErr(error.message);
    else if (protocolId) void reloadProtocolData(protocolId);
  }

  async function addRule(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!protocolId || !isAdmin) return;
    const fd = new FormData(e.currentTarget);
    const conditionRaw = String(fd.get("condition_json") ?? "{}").trim();
    let condition: Record<string, unknown> = {};
    try {
      condition = JSON.parse(conditionRaw || "{}") as Record<string, unknown>;
    } catch {
      setErr("JSON da condição inválido");
      return;
    }
    const linkRaw = String(fd.get("link_guideline_id") ?? "").trim();
    const { error } = await supabase.from("protocol_alert_rules").insert({
      protocol_id: protocolId,
      name: String(fd.get("name") ?? ""),
      time_anchor: String(fd.get("time_anchor") ?? "from_cycle_start") as ProtocolAlertRuleRow["time_anchor"],
      day_offset_min: Number(fd.get("day_offset_min") ?? 0),
      day_offset_max: String(fd.get("day_offset_max") ?? "").trim() === "" ? null : Number(fd.get("day_offset_max")),
      metric_kind: String(fd.get("metric_kind") ?? "custom") as ProtocolAlertRuleRow["metric_kind"],
      condition,
      severity_level: String(fd.get("severity_level") ?? "medium"),
      action_required: String(fd.get("action_required") ?? ""),
      message_template: String(fd.get("message_template") ?? "") || null,
      link_guideline_id: linkRaw === "" ? null : linkRaw,
      enabled: fd.get("enabled") === "on",
      sort_order: Number(fd.get("sort_order") ?? 0),
    });
    if (error) {
      setErr(error.message);
      return;
    }
    e.currentTarget.reset();
    void reloadProtocolData(protocolId);
  }

  async function deleteRule(id: string) {
    if (!isAdmin) return;
    setBusy(true);
    const { error } = await supabase.from("protocol_alert_rules").delete().eq("id", id);
    setBusy(false);
    if (error) setErr(error.message);
    else if (protocolId) void reloadProtocolData(protocolId);
  }

  async function addRef(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!isAdmin) return;
    const fd = new FormData(e.currentTarget);
    const syn = String(fd.get("synonyms") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const { error } = await supabase.from("medication_reference").insert({
      canonical_name: String(fd.get("canonical_name") ?? ""),
      synonyms: syn,
      rxnorm_cui: String(fd.get("rxnorm_cui") ?? "").trim() || null,
    });
    if (error) {
      setErr(error.message);
      return;
    }
    e.currentTarget.reset();
    if (protocolId) void reloadProtocolData(protocolId);
  }

  async function deleteRef(id: string) {
    if (!isAdmin) return;
    setBusy(true);
    const { error } = await supabase.from("medication_reference").delete().eq("id", id);
    setBusy(false);
    if (error) setErr(error.message);
    else if (protocolId) void reloadProtocolData(protocolId);
  }

  async function addWatch(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!protocolId || !isAdmin) return;
    const fd = new FormData(e.currentTarget);
    const { error } = await supabase.from("protocol_medication_watch").insert({
      protocol_id: protocolId,
      medication_reference_id: String(fd.get("medication_reference_id") ?? ""),
      guideline_id: String(fd.get("guideline_id") ?? ""),
      priority: Number(fd.get("priority") ?? 0),
      notes: String(fd.get("notes") ?? "").trim() || null,
    });
    if (error) {
      setErr(error.message);
      return;
    }
    e.currentTarget.reset();
    void reloadProtocolData(protocolId);
  }

  async function deleteWatch(id: string) {
    if (!isAdmin) return;
    setBusy(true);
    const { error } = await supabase.from("protocol_medication_watch").delete().eq("id", id);
    setBusy(false);
    if (error) setErr(error.message);
    else if (protocolId) void reloadProtocolData(protocolId);
  }

  if (!isAdmin) {
    return (
      <div className="p-6 md:p-10">
        <Card className="max-w-lg rounded-[32px] border-[3px] border-[#F3F4F6]">
          <CardHeader>
            <CardTitle>Configuração de protocolos</CardTitle>
            <CardDescription>Disponível apenas para administradores hospitalares.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6 md:p-10">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Protocolos e alertas</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Janelas temporais, regras de métrica e vigilância por medicamento de referência.
        </p>
      </div>

      {err ? (
        <div className="rounded-2xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#7F1D1D]" role="alert">
          {err}
        </div>
      ) : null}

      <div className="flex flex-wrap items-end gap-4">
        <div className="min-w-[220px]">
          <label htmlFor="proto" className="text-sm font-medium">
            Protocolo
          </label>
          <select
            id="proto"
            className={selectClass()}
            value={protocolId}
            onChange={(e) => setProtocolId(e.target.value)}
            disabled={loading}
          >
            <option value="">—</option>
            {protocols.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <Button type="button" variant="outline" className="rounded-2xl" onClick={() => void loadProtocols()} disabled={busy}>
          Atualizar lista
        </Button>
      </div>

      {loading && protocolId ? (
        <p className="text-sm text-muted-foreground">A carregar…</p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-[28px] border-[3px] border-[#F3F4F6]">
          <CardHeader>
            <CardTitle className="text-lg">Janelas de diretrizes</CardTitle>
            <CardDescription>Filtra quais diretrizes aparecem em cada fase do ciclo.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2 text-sm">
              {windows.map((w) => (
                <li key={w.id} className="flex flex-wrap items-start justify-between gap-2 rounded-2xl border border-[#E8EAED] bg-white px-3 py-2">
                  <div>
                    <span className="font-semibold">{guidelines.find((g) => g.id === w.guideline_id)?.title ?? w.guideline_id.slice(0, 8)}</span>
                    <p className="text-xs text-muted-foreground">
                      {w.time_anchor} · dias {w.day_offset_min}
                      {w.day_offset_max != null ? `–${w.day_offset_max}` : `+`}
                    </p>
                  </div>
                  <Button type="button" variant="ghost" size="sm" className="shrink-0 text-red-600" disabled={busy} onClick={() => void deleteWindow(w.id)}>
                    Remover
                  </Button>
                </li>
              ))}
              {windows.length === 0 ? <li className="text-xs text-muted-foreground">Sem janelas (todas as diretrizes do protocolo aplicam-se).</li> : null}
            </ul>
            <form className="space-y-3 border-t pt-4" onSubmit={addWindow}>
              <div>
                <label className="text-sm font-medium">Diretriz</label>
                <select name="guideline_id" className={selectClass()} required>
                  <option value="">—</option>
                  {guidelines.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.title} ({g.category})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Âncora</label>
                <select name="time_anchor" className={selectClass()} defaultValue="from_cycle_start">
                  {ANCHORS.map((a) => (
                    <option key={a.value} value={a.value}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Dia mín.</label>
                  <Input name="day_offset_min" type="number" min={0} defaultValue={0} className="rounded-2xl" required />
                </div>
                <div>
                  <label className="text-sm font-medium">Dia máx. (vazio = sem teto)</label>
                  <Input name="day_offset_max" type="number" min={0} className="rounded-2xl" placeholder="opcional" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Prioridade</label>
                <Input name="priority" type="number" defaultValue={0} className="rounded-2xl" />
              </div>
              <Button type="submit" className="rounded-2xl" disabled={!protocolId || busy}>
                Adicionar janela
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="rounded-[28px] border-[3px] border-[#F3F4F6]">
          <CardHeader>
            <CardTitle className="text-lg">Regras de alerta</CardTitle>
            <CardDescription>Métrica + limiar (JSON). Ex.: {"{"}"op":"gte","value":38{"}"}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2 text-sm">
              {rules.map((r) => (
                <li key={r.id} className="flex flex-wrap items-start justify-between gap-2 rounded-2xl border border-[#E8EAED] bg-white px-3 py-2">
                  <div>
                    <span className="font-semibold">{r.name}</span>
                    <p className="text-xs text-muted-foreground">
                      {r.metric_kind} · {r.enabled ? "ativa" : "desativada"}
                    </p>
                  </div>
                  <Button type="button" variant="ghost" size="sm" className="shrink-0 text-red-600" disabled={busy} onClick={() => void deleteRule(r.id)}>
                    Remover
                  </Button>
                </li>
              ))}
              {rules.length === 0 ? <li className="text-xs text-muted-foreground">Nenhuma regra.</li> : null}
            </ul>
            <form className="space-y-3 border-t pt-4" onSubmit={addRule}>
              <div>
                <label className="text-sm font-medium">Nome</label>
                <Input name="name" className="rounded-2xl" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Âncora</label>
                  <select name="time_anchor" className={selectClass()} defaultValue="from_cycle_start">
                    {ANCHORS.map((a) => (
                      <option key={a.value} value={a.value}>
                        {a.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Métrica</label>
                  <select name="metric_kind" className={selectClass()} defaultValue="body_temperature">
                    {METRICS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Dia mín.</label>
                  <Input name="day_offset_min" type="number" min={0} defaultValue={0} className="rounded-2xl" required />
                </div>
                <div>
                  <label className="text-sm font-medium">Dia máx.</label>
                  <Input name="day_offset_max" type="number" min={0} className="rounded-2xl" placeholder="opcional" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Condição (JSON)</label>
                <Input name="condition_json" className="font-mono text-sm rounded-2xl" defaultValue='{"op":"gte","value":38}' />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Gravidade</label>
                  <select name="severity_level" className={selectClass()} defaultValue="high">
                    {SEVERITY.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Ordem</label>
                  <Input name="sort_order" type="number" defaultValue={0} className="rounded-2xl" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Ação obrigatória</label>
                <Input name="action_required" className="rounded-2xl" placeholder="Contactar equipa…" />
              </div>
              <div>
                <label className="text-sm font-medium">Mensagem (template)</label>
                <Input name="message_template" className="rounded-2xl" placeholder="Febre ≥ 38°C…" />
              </div>
              <div>
                <label className="text-sm font-medium">Diretriz ligada (opcional)</label>
                <select name="link_guideline_id" className={selectClass()}>
                  <option value="">—</option>
                  {guidelines.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.title}
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="enabled" defaultChecked className="size-4 rounded" />
                Ativa
              </label>
              <Button type="submit" className="rounded-2xl" disabled={!protocolId || busy}>
                Adicionar regra
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="rounded-[28px] border-[3px] border-[#F3F4F6]">
          <CardHeader>
            <CardTitle className="text-lg">Medicamentos de referência</CardTitle>
            <CardDescription>Catálogo global para match com nome do paciente.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2 text-sm">
              {refs.map((ref) => (
                <li key={ref.id} className="flex flex-wrap items-start justify-between gap-2 rounded-2xl border border-[#E8EAED] bg-white px-3 py-2">
                  <div>
                    <span className="font-semibold">{ref.canonical_name}</span>
                    {ref.synonyms?.length ? (
                      <p className="text-xs text-muted-foreground">{ref.synonyms.join(", ")}</p>
                    ) : null}
                  </div>
                  <Button type="button" variant="ghost" size="sm" className="shrink-0 text-red-600" disabled={busy} onClick={() => void deleteRef(ref.id)}>
                    Remover
                  </Button>
                </li>
              ))}
            </ul>
            <form className="space-y-3 border-t pt-4" onSubmit={addRef}>
              <div>
                <label className="text-sm font-medium">Nome canónico</label>
                <Input name="canonical_name" className="rounded-2xl" required />
              </div>
              <div>
                <label className="text-sm font-medium">Sinónimos (separados por vírgula)</label>
                <Input name="synonyms" className="rounded-2xl" placeholder="ex.: oxaliplatina" />
              </div>
              <div>
                <label className="text-sm font-medium">RxNorm CUI (opcional)</label>
                <Input name="rxnorm_cui" className="rounded-2xl" />
              </div>
              <Button type="submit" className="rounded-2xl" disabled={busy}>
                Adicionar referência
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="rounded-[28px] border-[3px] border-[#F3F4F6]">
          <CardHeader>
            <CardTitle className="text-lg">Vigilância por fármaco</CardTitle>
            <CardDescription>Quando o paciente toma o fármaco, reforça diretrizes (ex.: neuropatia).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2 text-sm">
              {watches.map((w) => (
                <li key={w.id} className="flex flex-wrap items-start justify-between gap-2 rounded-2xl border border-[#E8EAED] bg-white px-3 py-2">
                  <div>
                    <span className="font-semibold">{refs.find((r) => r.id === w.medication_reference_id)?.canonical_name ?? w.medication_reference_id}</span>
                    <p className="text-xs text-muted-foreground">
                      → {guidelines.find((g) => g.id === w.guideline_id)?.title ?? w.guideline_id}
                    </p>
                  </div>
                  <Button type="button" variant="ghost" size="sm" className="shrink-0 text-red-600" disabled={busy} onClick={() => void deleteWatch(w.id)}>
                    Remover
                  </Button>
                </li>
              ))}
              {watches.length === 0 ? <li className="text-xs text-muted-foreground">Nenhum vínculo.</li> : null}
            </ul>
            <form className="space-y-3 border-t pt-4" onSubmit={addWatch}>
              <div>
                <label className="text-sm font-medium">Medicamento (referência)</label>
                <select name="medication_reference_id" className={selectClass()} required>
                  <option value="">—</option>
                  {refs.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.canonical_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Diretriz a reforçar</label>
                <select name="guideline_id" className={selectClass()} required>
                  <option value="">—</option>
                  {guidelines.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Prioridade</label>
                <Input name="priority" type="number" defaultValue={0} className="rounded-2xl" />
              </div>
              <div>
                <label className="text-sm font-medium">Notas</label>
                <Input name="notes" className="rounded-2xl" />
              </div>
              <Button type="submit" className="rounded-2xl" disabled={!protocolId || busy}>
                Adicionar vigilância
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
