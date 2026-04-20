import { useCallback, useEffect, useState } from "react";
import { Building2, Loader2, Save, Webhook } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { sanitizeSupabaseError } from "@/lib/errorMessages";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useOncoCare } from "@/context/OncoCareContext";
import { toast } from "sonner";

type HospitalRow = {
  id: string;
  name: string;
  display_name: string | null;
  logo_url: string | null;
  brand_color_hex: string | null;
  alert_webhook_url: string | null;
  alert_webhook_secret: string | null;
  fhir_export_enabled: boolean;
  triage_config: Record<string, unknown> | null;
};

type ProtocolRow = { id: string; name: string };

export function HospitalSettingsPage() {
  const { staffProfile } = useOncoCare();
  const isAdmin = staffProfile?.role === "hospital_admin";
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hospitalId, setHospitalId] = useState<string | null>(null);
  const [h, setH] = useState<HospitalRow | null>(null);
  const [triageJson, setTriageJson] = useState("{}");
  const [protocols, setProtocols] = useState<ProtocolRow[]>([]);
  const [hpActive, setHpActive] = useState<Record<string, boolean>>({});
  const [staffRows, setStaffRows] = useState<
    { staff_id: string; hospital_id: string; role: string; profiles: { full_name: string | null; email_display?: string | null } | null }[]
  >([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) return;
      const { data: sa, error: e1 } = await supabase.from("staff_assignments").select("hospital_id").eq("staff_id", uid).limit(1).maybeSingle();
      if (e1 || !sa?.hospital_id) {
        toast.error("Sem hospital associado.");
        return;
      }
      const hid = sa.hospital_id;
      setHospitalId(hid);
      const { data: hosp, error: e2 } = await supabase
        .from("hospitals")
        .select("id, name, display_name, logo_url, brand_color_hex, alert_webhook_url, alert_webhook_secret, fhir_export_enabled, triage_config")
        .eq("id", hid)
        .single();
      if (e2 || !hosp) {
        toast.error(sanitizeSupabaseError(e2));
        return;
      }
      setH(hosp as HospitalRow);
      setTriageJson(JSON.stringify(hosp.triage_config ?? {}, null, 2));

      const { data: prows } = await supabase.from("protocols").select("id, name").order("name");
      setProtocols((prows as ProtocolRow[]) ?? []);

      const { data: hp } = await supabase.from("hospital_protocols").select("protocol_id, active").eq("hospital_id", hid);
      const map: Record<string, boolean> = {};
      for (const row of hp ?? []) {
        map[(row as { protocol_id: string }).protocol_id] = Boolean((row as { active: boolean }).active);
      }
      setHpActive(map);

      const { data: sas, error: sasErr } = await supabase
        .from("staff_assignments")
        .select("staff_id, profiles(id, full_name, email_display, role)")
        .eq("hospital_id", hid);
      if (sasErr) {
        toast.error(sanitizeSupabaseError(sasErr));
        setStaffRows([]);
      } else {
        setStaffRows(
          (sas ?? []).map((r) => {
            const row = r as {
              staff_id: string;
              profiles: { id: string; full_name: string | null; email_display: string | null; role: string } | { id: string; full_name: string | null; email_display: string | null; role: string }[] | null;
            };
            const pr = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
            return {
              staff_id: row.staff_id,
              hospital_id: hid,
              role: pr?.role ?? "—",
              profiles: pr ? { full_name: pr.full_name, email_display: pr.email_display } : null,
            };
          })
        );
      }
    } catch (err) {
      toast.error(sanitizeSupabaseError(err as { message?: string }));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveHospital(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin || !hospitalId || !h) return;
    let triage: Record<string, unknown> = {};
    try {
      triage = JSON.parse(triageJson) as Record<string, unknown>;
    } catch {
      toast.error("triage_config JSON inválido.");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("hospitals")
        .update({
          display_name: h.display_name,
          logo_url: h.logo_url,
          brand_color_hex: h.brand_color_hex,
          alert_webhook_url: h.alert_webhook_url,
          alert_webhook_secret: h.alert_webhook_secret,
          fhir_export_enabled: h.fhir_export_enabled,
          triage_config: triage,
        })
        .eq("id", hospitalId);
      if (error) throw error;
      toast.success("Configurações guardadas.");
      void load();
    } catch (err) {
      toast.error(sanitizeSupabaseError(err as { message?: string }));
    } finally {
      setSaving(false);
    }
  }

  async function toggleProtocol(pid: string, active: boolean) {
    if (!isAdmin || !hospitalId) return;
    const { error } = await supabase.from("hospital_protocols").upsert(
      { hospital_id: hospitalId, protocol_id: pid, active, custom_config: {} },
      { onConflict: "hospital_id,protocol_id" }
    );
    if (error) {
      toast.error(sanitizeSupabaseError(error));
      return;
    }
    setHpActive((m) => ({ ...m, [pid]: active }));
    toast.success(active ? "Protocolo ativado." : "Protocolo desativado.");
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="size-6 animate-spin" />
        A carregar…
      </div>
    );
  }

  if (!h) return <p className="p-8 text-destructive">Hospital não encontrado.</p>;

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Configurações da empresa</h1>
        <p className="text-sm text-muted-foreground">White-label, webhooks e triagem — apenas administradores hospitalares podem gravar.</p>
      </div>

      <form onSubmit={(e) => void saveHospital(e)} className="space-y-6">
        <Card className="rounded-3xl border border-slate-200/80 p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
            <Building2 className="size-5 text-teal-600" />
            Identidade visual
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-muted-foreground">Nome apresentado</label>
              <Input
                value={h.display_name ?? ""}
                onChange={(e) => setH({ ...h, display_name: e.target.value || null })}
                placeholder={h.name}
                disabled={!isAdmin}
                className="mt-1 rounded-xl"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Cor primária (#hex)</label>
              <Input
                value={h.brand_color_hex ?? ""}
                onChange={(e) => setH({ ...h, brand_color_hex: e.target.value || null })}
                placeholder="#0d9488"
                disabled={!isAdmin}
                className="mt-1 rounded-xl"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">URL do logótipo</label>
              <Input
                value={h.logo_url ?? ""}
                onChange={(e) => setH({ ...h, logo_url: e.target.value || null })}
                placeholder="https://…"
                disabled={!isAdmin}
                className="mt-1 rounded-xl"
              />
            </div>
          </div>
        </Card>

        <Card className="rounded-3xl border border-slate-200/80 p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
            <Webhook className="size-5 text-amber-600" />
            Integrações
          </h2>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Webhook de alertas (URL)</label>
              <Input
                value={h.alert_webhook_url ?? ""}
                onChange={(e) => setH({ ...h, alert_webhook_url: e.target.value || null })}
                disabled={!isAdmin}
                className="mt-1 rounded-xl"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Segredo do webhook (HMAC)</label>
              <Input
                type="password"
                value={h.alert_webhook_secret ?? ""}
                onChange={(e) => setH({ ...h, alert_webhook_secret: e.target.value || null })}
                disabled={!isAdmin}
                className="mt-1 rounded-xl"
                placeholder="••••••••"
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={h.fhir_export_enabled}
                onChange={(e) => setH({ ...h, fhir_export_enabled: e.target.checked })}
                disabled={!isAdmin}
              />
              Habilitar exportação FHIR R4 (botão no dossiê)
            </label>
          </div>
        </Card>

        <Card className="rounded-3xl border border-slate-200/80 p-6 shadow-sm">
          <h2 className="mb-2 text-lg font-bold">Triagem (JSON)</h2>
          <textarea
            value={triageJson}
            onChange={(e) => setTriageJson(e.target.value)}
            disabled={!isAdmin}
            rows={6}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/80 p-3 font-mono text-xs"
          />
        </Card>

        {isAdmin ? (
          <Button type="submit" disabled={saving} className="rounded-2xl">
            {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
            Guardar alterações
          </Button>
        ) : (
          <p className="text-sm text-amber-800">Apenas utilizadores com perfil hospital_admin podem alterar estas definições.</p>
        )}
      </form>

      <Card className="rounded-3xl border border-slate-200/80 p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-bold">Protocolos clínicos no hospital</h2>
        <ul className="space-y-2">
          {protocols.map((p) => (
            <li key={p.id} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2">
              <span className="font-medium">{p.name}</span>
              {isAdmin ? (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={hpActive[p.id] ?? false}
                    onChange={(e) => void toggleProtocol(p.id, e.target.checked)}
                  />
                  Ativo
                </label>
              ) : (
                <span className="text-xs text-muted-foreground">{hpActive[p.id] ? "Ativo" : "—"}</span>
              )}
            </li>
          ))}
        </ul>
      </Card>

      <Card className="rounded-3xl border border-slate-200/80 p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-bold">Equipa (lotações)</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                <th className="py-2">Nome</th>
                <th className="py-2">Papel</th>
              </tr>
            </thead>
            <tbody>
              {staffRows.map((s) => (
                <tr key={s.staff_id} className="border-b border-slate-100">
                  <td className="py-2 font-medium">{s.profiles?.full_name ?? "—"}</td>
                  <td className="py-2 text-muted-foreground">{s.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Alteração de papéis sensíveis deve ser feita via políticas de segurança no Supabase (guard existente).
        </p>
      </Card>
    </div>
  );
}
