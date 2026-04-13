import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { readEnvBackendUrl, resolveBackendUrl } from "@/lib/backendUrl";
import { formatPtDateTime } from "@/lib/dashboardFormat";
import { symptomCategoryLabel, symptomSeverityLabel } from "@/lib/patientModalHelpers";
import type { OutboundMessageRow, SymptomLogDetail, WaProfileSnap } from "@/types/dashboard";
import { Button } from "@/components/ui/button";

type Props = {
  session: Session | null;
  patientId: string;
};

export function PatientMensagensDossierPanel({ session, patientId }: Props) {
  const [waProfile, setWaProfile] = useState<WaProfileSnap | null>(null);
  const allowOverride = import.meta.env.DEV;
  const envUrl = readEnvBackendUrl();
  const backendUrl = resolveBackendUrl(allowOverride, null, envUrl);
  const [symptoms, setSymptoms] = useState<SymptomLogDetail[]>([]);
  const [outbound, setOutbound] = useState<OutboundMessageRow[]>([]);
  const [symptomId, setSymptomId] = useState<string>("");
  const [compose, setCompose] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const { data: prow } = await supabase
        .from("patients")
        .select("profiles!patients_profile_id_fkey ( phone_e164, whatsapp_opt_in_at, whatsapp_opt_in_revoked_at )")
        .eq("id", patientId)
        .maybeSingle();
      const pr = prow?.profiles as { phone_e164?: string; whatsapp_opt_in_at?: string; whatsapp_opt_in_revoked_at?: string } | undefined;
      const p0 = Array.isArray(pr) ? pr[0] : pr;
      if (p0) {
        setWaProfile({
          phone_e164: p0.phone_e164 ?? null,
          optIn: Boolean(p0.whatsapp_opt_in_at && !p0.whatsapp_opt_in_revoked_at),
        });
      } else {
        setWaProfile(null);
      }
    })();
  }, [patientId]);

  useEffect(() => {
    void (async () => {
      const [s, o] = await Promise.all([
        supabase
          .from("symptom_logs")
          .select(
            "id, symptom_category, severity, body_temperature, logged_at, notes, entry_kind, pain_level, nausea_level, fatigue_level, requires_action, mood, symptom_started_at, symptom_ended_at"
          )
          .eq("patient_id", patientId)
          .order("logged_at", { ascending: false })
          .limit(60),
        supabase
          .from("outbound_messages")
          .select("id, body, status, created_at, error_detail, symptom_log_id")
          .eq("patient_id", patientId)
          .order("created_at", { ascending: false })
          .limit(25),
      ]);
      setSymptoms(!s.error && s.data ? (s.data as SymptomLogDetail[]) : []);
      setOutbound(!o.error && o.data ? (o.data as OutboundMessageRow[]) : []);
    })();
  }, [patientId]);

  async function send() {
    if (!session || !backendUrl) {
      setErr("Configure o backend (VITE_BACKEND_URL).");
      return;
    }
    const text = compose.trim();
    if (!text) {
      setErr("Digite uma mensagem.");
      return;
    }
    setBusy(true);
    setErr(null);
    setOk(null);
    try {
      const body: { patient_id: string; message: string; symptom_log_id?: string } = {
        patient_id: patientId,
        message: text,
      };
      if (symptomId) body.symptom_log_id = symptomId;
      const r = await fetch(`${backendUrl}/api/whatsapp/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(body),
      });
      const j = (await r.json()) as { error?: string; message?: string };
      if (!r.ok) {
        setErr((j.message as string | undefined) ?? j.error ?? `Erro ${r.status}`);
        return;
      }
      setCompose("");
      setOk("Mensagem enviada.");
      const { data } = await supabase
        .from("outbound_messages")
        .select("id, body, status, created_at, error_detail, symptom_log_id")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false })
        .limit(25);
      setOutbound((data ?? []) as OutboundMessageRow[]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Falha de rede");
    } finally {
      setBusy(false);
    }
  }

  if (!backendUrl) {
    return <p className="text-sm text-muted-foreground">Indique VITE_BACKEND_URL para mensagens WhatsApp.</p>;
  }
  if (waProfile && !waProfile.optIn) {
    return <p className="text-sm text-muted-foreground">Paciente sem opt-in WhatsApp.</p>;
  }
  if (waProfile && !waProfile.phone_e164) {
    return <p className="text-sm text-muted-foreground">Sem telefone E.164 no perfil.</p>;
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-bold uppercase text-muted-foreground">Contexto clínico (opcional)</label>
        <select
          className="mt-1 w-full max-w-xl rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-sm"
          value={symptomId}
          onChange={(e) => setSymptomId(e.target.value)}
        >
          <option value="">Sem vínculo a sintoma</option>
          {symptoms.map((s) => (
            <option key={s.id} value={s.id}>
              {symptomCategoryLabel(s)} · {symptomSeverityLabel(s)} · {formatPtDateTime(s.logged_at)}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-xs font-bold uppercase text-muted-foreground">Mensagem</label>
        <textarea
          className="mt-1 w-full min-h-[96px] rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm"
          value={compose}
          onChange={(e) => setCompose(e.target.value)}
          maxLength={4096}
        />
      </div>
      <Button type="button" className="rounded-2xl" disabled={busy} onClick={() => void send()}>
        {busy ? "A enviar…" : "Enviar via WhatsApp"}
      </Button>
      {err ? (
        <p className="text-sm text-[#B91C1C]" role="alert">
          {err}
        </p>
      ) : null}
      {ok ? <p className="text-sm text-[#166534]">{ok}</p> : null}
      <div>
        <p className="text-xs font-bold uppercase text-muted-foreground">Últimos envios</p>
        <ul className="mt-2 space-y-2 text-sm">
          {outbound.map((m) => (
            <li key={m.id} className="rounded-xl border border-[#F1F5F9] px-3 py-2">
              <span className="font-semibold">{m.status}</span> · {formatPtDateTime(m.created_at)}
              {m.symptom_log_id ? <span className="ml-2 text-xs text-[#6366F1]">· contexto sintoma</span> : null}
              <p className="text-muted-foreground">{(m.body ?? "—").slice(0, 200)}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
