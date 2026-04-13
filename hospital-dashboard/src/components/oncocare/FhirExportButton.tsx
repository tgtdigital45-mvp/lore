import { FileJson } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { readEnvBackendUrl, readSessionBackendUrl, resolveBackendUrl } from "@/lib/backendUrl";
import { refreshSupabaseSessionIfStale } from "@/lib/authSession";
import { supabase } from "@/lib/supabase";

type Props = {
  patientId: string;
};

export function FhirExportButton({ patientId }: Props) {
  const [msg, setMsg] = useState<string | null>(null);
  const base = resolveBackendUrl(import.meta.env.DEV, readSessionBackendUrl(), readEnvBackendUrl()).replace(/\/$/, "");

  async function open(kind: "patient" | "obs") {
    setMsg(null);
    const { data: auth } = await supabase.auth.getSession();
    const session = await refreshSupabaseSessionIfStale(auth.session);
    const token = session?.access_token;
    if (!token || !base) {
      setMsg("Defina VITE_BACKEND_URL e inicie sessão.");
      return;
    }
    const url =
      kind === "patient"
        ? `${base}/api/fhir/Patient/${patientId}`
        : `${base}/api/fhir/Observation?patient=${encodeURIComponent(`Patient/${patientId}`)}`;
    const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) {
      setMsg(`Erro ${r.status}`);
      return;
    }
    const j = await r.json();
    const w = window.open("", "_blank");
    if (w) {
      w.document.write(`<pre>${JSON.stringify(j, null, 2)}</pre>`);
      w.document.close();
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" className="rounded-2xl" onClick={() => void open("patient")}>
          <FileJson className="mr-2 size-4" />
          FHIR Paciente
        </Button>
        <Button type="button" variant="outline" className="rounded-2xl" onClick={() => void open("obs")}>
          <FileJson className="mr-2 size-4" />
          FHIR Observações (sintomas)
        </Button>
      </div>
      {msg ? <p className="text-xs text-[#B91C1C]">{msg}</p> : null}
    </div>
  );
}
