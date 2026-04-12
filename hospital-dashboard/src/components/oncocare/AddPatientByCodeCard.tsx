import { useEffect, useState } from "react";
import { UserPlus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { normalizePatientCodeForLookup } from "@/lib/patientCode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Props = {
  loadTriage: () => void | Promise<void>;
  hospitalId: string | null;
  hospitalOptions: { id: string; name: string }[];
};

export function AddPatientByCodeCard({ loadTriage, hospitalId, hospitalOptions }: Props) {
  const [code, setCode] = useState("");
  const [targetHospitalId, setTargetHospitalId] = useState<string>("");
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
      setMsg({ kind: "err", text: "Não há hospital associado ao seu utilizador." });
      return;
    }

    setBusy(true);
    try {
      const { data: searchRows, error: searchErr } = await supabase.rpc("search_patient_by_code", {
        p_code: normalized,
        p_hospital_id: effectiveHospitalId,
      });

      if (searchErr) {
        setMsg({ kind: "err", text: searchErr.message });
        return;
      }

      const row = (searchRows as { patient_id: string; masked_name: string; already_linked: boolean }[] | null)?.[0];
      if (!row) {
        setMsg({ kind: "err", text: "Código não encontrado. Confirme com o paciente no app Aura." });
        return;
      }

      if (row.already_linked) {
        setMsg({
          kind: "info",
          text: `Este pedido já existe ou o vínculo está ativo (${row.masked_name}). A lista será atualizada.`,
        });
        await loadTriage();
        return;
      }

      const { data: auth } = await supabase.auth.getSession();
      const uid = auth.session?.user?.id;
      if (!uid) {
        setMsg({ kind: "err", text: "Sessão inválida. Inicie sessão novamente." });
        return;
      }

      const { error: insErr } = await supabase.from("patient_hospital_links").insert({
        patient_id: row.patient_id,
        hospital_id: effectiveHospitalId,
        permission_level: "read",
        status: "pending",
        requested_by: uid,
      });

      if (insErr) {
        if (insErr.code === "23505") {
          setMsg({
            kind: "info",
            text: "Já existe um pedido para este paciente neste hospital.",
          });
        } else {
          setMsg({ kind: "err", text: insErr.message });
        }
        await loadTriage();
        return;
      }

      setMsg({
        kind: "ok",
        text: `Pedido enviado para ${row.masked_name}. O paciente deve aprovar em Aura → Autorizações.`,
      });
      setCode("");
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
            Introduza o código público do paciente (Aura). Será criado um pedido de vínculo; após aprovação no telemóvel, o dossiê passa a aparecer na triagem.
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
