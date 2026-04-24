import { useState } from "react";
import { Calendar, Plus } from "lucide-react";
import type { TimelineEventRow } from "@/hooks/useDossierExtended";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { formatPtShort } from "@/lib/dashboardFormat";
import { ClinicalEmptyState } from "@/components/patient/ClinicalEmptyState";
import { sanitizeSupabaseError } from "@/lib/errorMessages";
import { toast } from "sonner";

const KIND_LABEL: Record<string, string> = {
  diagnosis: "Diagnóstico",
  surgery: "Cirurgia",
  cycle_start: "Início de ciclo",
  infusion: "Infusão",
  imaging: "Imagiologia",
  lab_critical: "Lab crítico",
  toxicity: "Toxicidade",
  hospitalization: "Internação",
  custom: "Outro",
};

type Props = {
  patientId: string;
  events: TimelineEventRow[];
  onRefresh: () => void;
};

export function PatientTimelinePanel({ patientId, events, onRefresh }: Props) {
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState("custom");
  const [busy, setBusy] = useState(false);
  const [eventAt, setEventAt] = useState(() => new Date().toISOString().slice(0, 16));

  async function addEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("clinical_timeline_events").insert({
        patient_id: patientId,
        event_kind: kind,
        title: title.trim(),
        event_at: new Date(eventAt).toISOString(),
      });
      if (error) throw error;
      setTitle("");
      onRefresh();
      toast.success("Evento adicionado à linha do tempo.");
    } catch (err) {
      toast.error(sanitizeSupabaseError(err as { message?: string }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="rounded-3xl border border-white/60 bg-white/50 p-5 shadow-sm backdrop-blur-sm">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
          <Calendar className="size-5 text-teal-600" />
          Linha do tempo clínica
        </h2>
        <form onSubmit={(ev) => void addEvent(ev)} className="flex flex-wrap items-end gap-3">
          <div className="min-w-[140px] flex-1">
            <label className="text-xs font-semibold text-muted-foreground">Data/hora</label>
            <Input type="datetime-local" value={eventAt} onChange={(e) => setEventAt(e.target.value)} className="rounded-xl" />
          </div>
          <div className="min-w-[120px]">
            <label className="text-xs font-semibold text-muted-foreground">Tipo</label>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value)}
              className="h-10 w-full rounded-xl border border-[#E2E8F0] bg-white px-2 text-sm"
            >
              {Object.entries(KIND_LABEL).map(([k, lab]) => (
                <option key={k} value={k}>
                  {lab}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-[180px] flex-[2]">
            <label className="text-xs font-semibold text-muted-foreground">Título</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: TC de reavaliação" className="rounded-xl" />
          </div>
          <Button type="submit" disabled={busy} className="rounded-xl">
            <Plus className="mr-1 size-4" />
            Adicionar
          </Button>
        </form>
      </Card>

      <div className="relative border-l-2 border-teal-200/80 pl-6">
        {events.length === 0 ? (
          <ClinicalEmptyState
            icon={Calendar}
            title="Sem eventos na linha do tempo"
            description="Registe marcos clínicos (infusões, imagiologia, internações) para narrar a jornada."
          />
        ) : (
          <ul className="space-y-4">
            {events.map((ev) => (
              <li key={ev.id} className="relative">
                <span className="absolute -left-[1.6rem] top-1.5 size-3 rounded-full bg-teal-500 ring-4 ring-white" />
                <div className="rounded-2xl border border-white/60 bg-white/60 px-4 py-3 shadow-sm backdrop-blur-sm">
                  <p className="text-[0.65rem] font-bold uppercase tracking-wide text-teal-700">
                    {formatPtShort(ev.event_at)} · {KIND_LABEL[ev.event_kind] ?? ev.event_kind}
                  </p>
                  <p className="mt-1 font-semibold text-slate-900">{ev.title}</p>
                  {ev.description ? <p className="mt-1 text-sm text-muted-foreground">{ev.description}</p> : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

