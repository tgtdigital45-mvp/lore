import { useState } from "react";
import { MessageSquare, Send } from "lucide-react";
import type { ClinicalNoteFeedRow } from "@/hooks/useDossierExtended";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatPtDateTime } from "@/lib/dashboardFormat";
import { ClinicalEmptyState } from "@/components/patient/ClinicalEmptyState";
import { sanitizeSupabaseError } from "@/lib/errorMessages";
import { toast } from "sonner";

const NOTE_TYPES = [
  { value: "round_note", label: "Ronda" },
  { value: "nursing_note", label: "Enfermagem" },
  { value: "nutrition_note", label: "Nutrição" },
  { value: "psych_note", label: "Psicologia" },
];

type Props = {
  patientId: string;
  staffId: string | undefined;
  notes: ClinicalNoteFeedRow[];
  onRefresh: () => void;
};

export function PatientNotesPanel({ patientId, staffId, notes, onRefresh }: Props) {
  const [text, setText] = useState("");
  const [noteType, setNoteType] = useState("round_note");
  const [isPrivate, setIsPrivate] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!staffId || !text.trim()) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("clinical_notes").insert({
        patient_id: patientId,
        author_id: staffId,
        note_text: text.trim(),
        note_type: noteType,
        is_private: isPrivate,
      });
      if (error) throw error;
      setText("");
      onRefresh();
      toast.success("Nota registada.");
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
          <MessageSquare className="size-5 text-indigo-600" />
          Notas multidisciplinares
        </h2>
        <form onSubmit={(ev) => void submit(ev)} className="space-y-3">
          <div className="flex flex-wrap gap-3">
            <select
              value={noteType}
              onChange={(e) => setNoteType(e.target.value)}
              className="h-10 rounded-xl border border-[#E2E8F0] bg-white px-3 text-sm"
            >
              {NOTE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} />
              Privada (médico/gestão)
            </label>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            placeholder="Anotação de ronda, nutrição, psico…"
            className="w-full rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm"
          />
          <Button type="submit" disabled={busy || !staffId} className="rounded-xl">
            <Send className="mr-2 size-4" />
            Publicar nota
          </Button>
        </form>
      </Card>

      <ul className="space-y-3">
        {notes.length === 0 ? (
          <ClinicalEmptyState
            icon={MessageSquare}
            title="Sem notas da equipa"
            description="As notas aparecem aqui com o papel e a hora — visíveis à equipa (respeitando privacidade)."
          />
        ) : (
          notes.map((n) => (
            <li key={n.id} className="rounded-2xl border border-white/55 bg-white/55 px-4 py-3 shadow-sm backdrop-blur-sm">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="font-semibold text-slate-800">{n.author_name ?? "—"}</span>
                {n.author_role ? (
                  <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[0.65rem] font-bold text-indigo-900">{n.author_role}</span>
                ) : null}
                <span>· {formatPtDateTime(n.created_at)}</span>
                {n.is_private ? (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[0.65rem] font-bold text-amber-900">Privada</span>
                ) : null}
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{n.note_text}</p>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
