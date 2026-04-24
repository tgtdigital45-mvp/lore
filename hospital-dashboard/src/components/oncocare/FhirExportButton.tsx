import { FileJson } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { readEnvBackendUrl, readSessionBackendUrl, resolveBackendUrl } from "@/lib/backendUrl";
import { refreshSupabaseSessionIfStale } from "@/lib/authSession";
import { supabase } from "@/lib/supabase";

type Props = {
  patientId: string;
};

export function FhirExportButton({ patientId }: Props) {
  const [msg, setMsg] = useState<string | null>(null);
  const base = resolveBackendUrl(
    process.env.NODE_ENV === "development",
    readSessionBackendUrl(),
    readEnvBackendUrl()
  ).replace(/\/$/, "");

  async function open(kind: "patient" | "obs") {
    setMsg(null);
    const { data: auth } = await supabase.auth.getSession();
    const session = await refreshSupabaseSessionIfStale(auth.session);
    const token = session?.access_token;
    if (!token || !base) {
      const t = "Defina NEXT_PUBLIC_BACKEND_URL e inicie sessão.";
      setMsg(t);
      toast.error(t);
      return;
    }
    const url =
      kind === "patient"
        ? `${base}/api/fhir/Patient/${patientId}`
        : `${base}/api/fhir/Observation?patient=${encodeURIComponent(`Patient/${patientId}`)}`;
    const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) {
      const t = `Erro ${r.status}`;
      setMsg(t);
      toast.error(t);
      return;
    }
    const j = await r.json();
    const w = window.open("", "_blank");
    if (w) {
      w.document.write(`<pre>${JSON.stringify(j, null, 2)}</pre>`);
      w.document.close();
      toast.success(kind === "patient" ? "FHIR Paciente aberto num novo separador." : "FHIR Observações abertas num novo separador.");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          className="rounded-full border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50"
          onClick={() => void open("patient")}
        >
          <FileJson className="mr-2 size-4" />
          FHIR Paciente
        </Button>
        <Button
          type="button"
          variant="outline"
          className="rounded-full border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50"
          onClick={() => void open("obs")}
        >
          <FileJson className="mr-2 size-4" />
          FHIR Observações (sintomas)
        </Button>
      </div>
      {msg ? (
        <p className="text-xs text-destructive" role="alert" aria-live="assertive">
          {msg}
        </p>
      ) : null}
    </div>
  );
}
