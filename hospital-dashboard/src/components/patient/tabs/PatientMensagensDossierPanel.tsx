import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { readEnvBackendUrl, resolveBackendUrl } from "@/lib/backendUrl";
import { formatPtDateTime } from "@/lib/dashboardFormat";
import { symptomCategoryLabel, symptomSeverityLabel } from "@/lib/patientModalHelpers";
import type { OutboundMessageRow, SymptomLogDetail, WaProfileSnap, WhatsappInboundRow } from "@/types/dashboard";
import { Button } from "@/components/ui/button";
import { sanitizeHttpApiMessage, sanitizeSupabaseError, userFacingApiError } from "@/lib/errorMessages";
import { MensagensSkeleton } from "@/components/skeletons/MensagensSkeleton";

type Props = {
  session: Session | null;
  patientId: string;
};

export function PatientMensagensDossierPanel({ session, patientId }: Props) {
  const [waProfile, setWaProfile] = useState<WaProfileSnap | null>(null);
  const allowOverride = process.env.NODE_ENV === "development";
  const envUrl = readEnvBackendUrl();
  const backendUrl = resolveBackendUrl(allowOverride, null, envUrl);
  const [symptoms, setSymptoms] = useState<SymptomLogDetail[]>([]);
  const [outbound, setOutbound] = useState<OutboundMessageRow[]>([]);
  const [inbound, setInbound] = useState<WhatsappInboundRow[]>([]);
  const [symptomId, setSymptomId] = useState<string>("");
  const [compose, setCompose] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [profileLoadError, setProfileLoadError] = useState<string | null>(null);
  const [listFetchError, setListFetchError] = useState<string | null>(null);
  const [listLoading, setListLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      setProfileLoadError(null);
      const { data: prow, error: prowErr } = await supabase
        .from("patients")
        .select("profiles!patients_profile_id_fkey ( phone_e164, whatsapp_opt_in_at, whatsapp_opt_in_revoked_at )")
        .eq("id", patientId)
        .maybeSingle();
      if (prowErr) {
        setProfileLoadError(sanitizeSupabaseError(prowErr));
        setWaProfile(null);
        return;
      }
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
      setListLoading(true);
      setListFetchError(null);
      const [s, o, inc] = await Promise.all([
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
        supabase
          .from("whatsapp_inbound_messages")
          .select("id, body, from_phone, created_at")
          .eq("patient_id", patientId)
          .order("created_at", { ascending: false })
          .limit(30),
      ]);
      const errs: string[] = [];
      if (s.error) errs.push(sanitizeSupabaseError(s.error));
      if (o.error) errs.push(sanitizeSupabaseError(o.error));
      if (inc.error) errs.push(sanitizeSupabaseError(inc.error));
      setListFetchError(errs.length ? errs.join(" · ") : null);
      setSymptoms(!s.error && s.data ? (s.data as SymptomLogDetail[]) : []);
      setOutbound(!o.error && o.data ? (o.data as OutboundMessageRow[]) : []);
      setInbound(!inc.error && inc.data ? (inc.data as WhatsappInboundRow[]) : []);
      setListLoading(false);
    })();
  }, [patientId]);

  async function send() {
    if (!session || !backendUrl) {
      setErr("Configure o backend (NEXT_PUBLIC_BACKEND_URL).");
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
        setErr(sanitizeHttpApiMessage((j.message as string | undefined) ?? j.error, `Erro ${r.status}`));
        return;
      }
      setCompose("");
      setOk("Mensagem enviada.");
      const [{ data: outData }, { data: inData }] = await Promise.all([
        supabase
          .from("outbound_messages")
          .select("id, body, status, created_at, error_detail, symptom_log_id")
          .eq("patient_id", patientId)
          .order("created_at", { ascending: false })
          .limit(25),
        supabase
          .from("whatsapp_inbound_messages")
          .select("id, body, from_phone, created_at")
          .eq("patient_id", patientId)
          .order("created_at", { ascending: false })
          .limit(30),
      ]);
      setOutbound((outData ?? []) as OutboundMessageRow[]);
      if (!inData) setInbound([]);
      else setInbound(inData as WhatsappInboundRow[]);
    } catch (e) {
      setErr(userFacingApiError(e, "Falha de rede. Verifique a ligação."));
    } finally {
      setBusy(false);
    }
  }

  if (!backendUrl) {
    return <p className="text-sm text-muted-foreground">Indique NEXT_PUBLIC_BACKEND_URL para mensagens WhatsApp.</p>;
  }
  if (waProfile && !waProfile.optIn) {
    return <p className="text-sm text-muted-foreground">Paciente sem opt-in WhatsApp.</p>;
  }
  if (waProfile && !waProfile.phone_e164) {
    return <p className="text-sm text-muted-foreground">Sem telefone E.164 no perfil.</p>;
  }

  if (listLoading) {
    return <MensagensSkeleton />;
  }

  return (
    <div className="space-y-4">
      {profileLoadError ? (
        <p className="text-sm text-destructive" role="alert">
          {profileLoadError}
        </p>
      ) : null}
      {listFetchError ? (
        <p className="text-sm text-destructive" role="alert">
          {listFetchError}
        </p>
      ) : null}
      <p className="text-xs text-muted-foreground">
        O envio usa o backend (<code className="rounded bg-slate-100 px-1 font-mono text-[0.65rem]">POST /api/whatsapp/send</code>
        ): Meta Cloud API ou Evolution API. Receção listada abaixo vem do webhook{" "}
        <code className="font-mono">/api/evolution/webhook</code> (Evolution → Supabase). Com Meta e Evolution
        configurados no servidor, defina <code className="font-mono">MESSAGING_PROVIDER=evolution</code> para usar
        Baileys.
      </p>
      <div>
        <label htmlFor="dossier-wa-symptom-context" className="text-xs font-bold uppercase text-muted-foreground">
          Contexto clínico (opcional)
        </label>
        <select
          id="dossier-wa-symptom-context"
          className="mt-1 w-full max-w-xl rounded-xl border border-border bg-white px-3 py-2 text-sm"
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
        <label htmlFor="dossier-wa-compose" className="text-xs font-bold uppercase text-muted-foreground">
          Mensagem
        </label>
        <textarea
          id="dossier-wa-compose"
          className="mt-1 w-full min-h-[96px] rounded-xl border border-border px-3 py-2 text-sm"
          value={compose}
          onChange={(e) => setCompose(e.target.value)}
          maxLength={4096}
        />
      </div>
      <Button type="button" className="rounded-2xl" disabled={busy} onClick={() => void send()}>
        {busy ? "A enviar…" : "Enviar mensagem"}
      </Button>
      {err ? (
        <p className="text-sm text-destructive" role="alert">
          {err}
        </p>
      ) : null}
      {ok ? <p className="text-sm text-clinical-success">{ok}</p> : null}
      <div>
        <p className="text-xs font-bold uppercase text-muted-foreground">Recebidas (paciente → hospital)</p>
        {inbound.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Sem mensagens recebidas indexadas (webhook Evolution + migração Supabase).</p>
        ) : (
          <ul className="mt-2 space-y-2 text-sm">
            {inbound.map((m) => (
              <li key={m.id} className="rounded-xl border border-sky-200 bg-sky-50/40 px-3 py-2">
                <span className="font-mono text-[0.65rem] text-slate-600">{m.from_phone ?? "—"}</span> · {formatPtDateTime(m.created_at)}
                <p className="text-muted-foreground">{(m.body ?? "—").slice(0, 400)}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <p className="text-xs font-bold uppercase text-muted-foreground">Últimos envios (hospital → paciente)</p>
        {outbound.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Sem envios registrados para este doente (fila outbound + Evolution).</p>
        ) : (
          <ul className="mt-2 space-y-2 text-sm">
            {outbound.map((m) => (
              <li key={m.id} className="rounded-xl border border-border px-3 py-2">
                <span className="font-semibold">{m.status}</span> · {formatPtDateTime(m.created_at)}
                {m.symptom_log_id ? <span className="ml-2 text-xs text-clinical-indigo">· contexto sintoma</span> : null}
                <p className="text-muted-foreground">{(m.body ?? "—").slice(0, 200)}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
