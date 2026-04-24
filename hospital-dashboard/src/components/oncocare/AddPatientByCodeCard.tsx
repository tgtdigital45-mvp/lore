import { useEffect, useState } from "react";
import { UserPlus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { normalizePatientCodeForLookup } from "@/lib/patientCode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { sanitizeSupabaseError } from "@/lib/errorMessages";

type Props = {
  loadTriage: () => void | Promise<void>;
  hospitalId: string | null;
  hospitalOptions: { id: string; name: string }[];
};

type ValidityPreset = "" | "30" | "90" | "180" | "365";

function validityEndIso(preset: ValidityPreset): string | null {
  if (!preset) return null;
  const days = Number(preset);
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  d.setUTCHours(23, 59, 59, 999);
  return d.toISOString();
}

export function AddPatientByCodeCard({ loadTriage, hospitalId, hospitalOptions }: Props) {
  const [code, setCode] = useState("");
  const [targetHospitalId, setTargetHospitalId] = useState<string>("");
  const [validityPreset, setValidityPreset] = useState<ValidityPreset>("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err" | "info"; text: string } | null>(null);

  useEffect(() => {
    const h = hospitalId ?? hospitalOptions[0]?.id ?? "";
    setTargetHospitalId((prev) => (prev ? prev : h));
  }, [hospitalId, hospitalOptions]);

  const effectiveHospitalId = targetHospitalId || hospitalId || hospitalOptions[0]?.id || null;

  async function submit() {
    setMsg(null);
    const normalized = normalizePatientCodeForLookup(code);
    if (!normalized) {
      setMsg({ kind: "err", text: "Indique o código do paciente (ex.: AURA-A1B2C3)." });
      return;
    }
    if (!effectiveHospitalId) {
      setMsg({ kind: "err", text: "Não há hospital associado ao seu usuário." });
      return;
    }

    setBusy(true);
    try {
      const { data: searchRows, error: searchErr } = await supabase.rpc("search_patient_by_code", {
        p_code: normalized,
        p_hospital_id: effectiveHospitalId,
      });

      if (searchErr) {
        setMsg({ kind: "err", text: sanitizeSupabaseError(searchErr) });
        return;
      }

      const row = (searchRows as { patient_id: string; masked_name: string; link_status: string }[] | null)?.[0];
      if (!row) {
        setMsg({ kind: "err", text: "Código não encontrado. Confirme com o paciente no app Aura." });
        return;
      }

      const st = (row.link_status ?? "none").toLowerCase();

      if (st === "approved") {
        setMsg({
          kind: "info",
          text: `Este paciente já está vinculado ao hospital (${row.masked_name}). A fila foi atualizada.`,
        });
        await loadTriage();
        return;
      }

      if (st === "pending") {
        setMsg({
          kind: "info",
          text: `Já existe um pedido pendente para ${row.masked_name}. O paciente deve aprovar em Aura → Autorizações. Não é possível enviar outro pedido até essa decisão.`,
        });
        await loadTriage();
        return;
      }

      if (st !== "none" && st !== "rejected" && st !== "revoked") {
        setMsg({
          kind: "info",
          text: `Estado do vínculo: ${st}. Atualize a lista ou contacte suporte se precisar de ajuda.`,
        });
        await loadTriage();
        return;
      }

      const { data: auth } = await supabase.auth.getSession();
      if (!auth.session?.user?.id) {
        setMsg({ kind: "err", text: "Sessão inválida. Inicie sessão novamente." });
        return;
      }

      const accessUntil = validityEndIso(validityPreset);
      const { data: rpcRows, error: rpcErr } = await supabase.rpc("staff_request_patient_hospital_link", {
        p_patient_id: row.patient_id,
        p_hospital_id: effectiveHospitalId,
        p_permission_level: "read",
        p_access_valid_until: accessUntil,
      });

      if (rpcErr) {
        const raw = rpcErr.message ?? "";
        if (raw.includes("already_pending")) {
          setMsg({
            kind: "info",
            text: `Já existe um pedido pendente para ${row.masked_name}. O paciente deve responder em Aura → Autorizações.`,
          });
        } else if (raw.includes("already_approved")) {
          setMsg({
            kind: "info",
            text: `Este paciente já está vinculado ao hospital (${row.masked_name}).`,
          });
        } else {
          setMsg({ kind: "err", text: sanitizeSupabaseError(rpcErr) });
        }
        await loadTriage();
        return;
      }

      const outcome = (rpcRows as { outcome?: string }[] | null)?.[0]?.outcome ?? "inserted";
      const reopen = outcome === "reopened";

      setMsg({
        kind: "ok",
        text: reopen
          ? `Novo pedido enviado para ${row.masked_name} (após estado anterior encerrado). O paciente deve aprovar em Aura → Autorizações.`
          : `Pedido enviado para ${row.masked_name}. O paciente deve aprovar em Aura → Autorizações.`,
      });
      setCode("");
      setValidityPreset("");
      await loadTriage();
    } finally {
      setBusy(false);
    }
  }

  if (!hospitalOptions.length && !effectiveHospitalId) {
    return null;
  }

  return (
    <Card className="rounded-3xl border border-[#E8EAED] bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <UserPlus className="size-5 text-[#6366F1]" strokeWidth={2} />
            <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Adicionar paciente</h3>
          </div>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Digite o código público do paciente (Aura). Pode solicitar de novo após recusa ou revogação — cada pedido gera uma nova notificação no celular do paciente (Aura → Autorizações).
          </p>
          {hospitalOptions.length === 1 ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Hospital: <span className="font-semibold text-foreground">{hospitalOptions[0].name}</span>
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        {hospitalOptions.length > 1 ? (
          <label className="flex min-w-[200px] flex-1 flex-col gap-1.5 text-xs font-semibold text-muted-foreground">
            Hospital
            <select
              className={cn(
                "h-12 rounded-2xl border-[3px] border-[#F3F4F6] bg-white px-3 text-sm font-medium text-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6366F1]"
              )}
              value={effectiveHospitalId ?? ""}
              onChange={(e) => setTargetHospitalId(e.target.value)}
            >
              {hospitalOptions.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <label className="flex min-w-[160px] flex-col gap-1.5 text-xs font-semibold text-muted-foreground">
          Validade indicada (opcional)
          <select
            className={cn(
              "h-12 rounded-2xl border-[3px] border-[#F3F4F6] bg-white px-3 text-sm font-medium text-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6366F1]"
            )}
            value={validityPreset}
            onChange={(e) => setValidityPreset(e.target.value as ValidityPreset)}
            disabled={busy}
          >
            <option value="">Sem prazo definido</option>
            <option value="30">30 dias</option>
            <option value="90">90 dias</option>
            <option value="180">6 meses</option>
            <option value="365">12 meses</option>
          </select>
        </label>

        <label className="flex min-w-[220px] flex-1 flex-col gap-1.5 text-xs font-semibold text-muted-foreground">
          Código do paciente
          <Input
            placeholder="AURA-XXXXXX"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="h-12 rounded-2xl border-[3px] border-[#F3F4F6] font-mono text-sm uppercase"
            autoComplete="off"
            spellCheck={false}
            disabled={busy}
            onKeyDown={(e) => {
              if (e.key === "Enter") void submit();
            }}
          />
        </label>

        <Button
          type="button"
          className="h-12 shrink-0 rounded-2xl bg-[#0A0A0A] px-6 font-semibold"
          disabled={busy || !effectiveHospitalId}
          onClick={() => void submit()}
        >
          {busy ? "A enviar…" : "Pedir vínculo"}
        </Button>
      </div>

      {msg ? (
        <p
          className={cn(
            "mt-4 rounded-2xl px-4 py-3 text-sm",
            msg.kind === "ok" && "border border-emerald-200 bg-emerald-50 text-emerald-950",
            msg.kind === "info" && "border border-[#BFDBFE] bg-[#EFF6FF] text-[#1E3A8A]",
            msg.kind === "err" && "border border-[#FECACA] bg-[#FEF2F2] text-[#991B1B]"
          )}
          role={msg.kind === "err" ? "alert" : "status"}
        >
          {msg.text}
        </p>
      ) : null}
    </Card>
  );
}
