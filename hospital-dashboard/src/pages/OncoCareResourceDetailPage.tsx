import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Armchair, BedDouble, Trash2, Wrench } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { bookingOverlapsExisting } from "@/lib/chemoChairBlock";
import { cn } from "@/lib/utils";
import { patientDisplayName, kindLabel } from "@/lib/infusionResourceUi";
import { useOncoCare } from "@/context/OncoCareContext";
import { useInfusionAgenda, type InfusionBookingRow } from "@/hooks/useInfusionAgenda";
import { supabase } from "@/lib/supabase";

function toDatetimeLocalValue(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function defaultSlotInput(): string {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return toDatetimeLocalValue(d.getTime());
}

export function OncoCareResourceDetailPage() {
  const { resourceId } = useParams<{ resourceId: string }>();
  const navigate = useNavigate();
  const { rows: patientRows } = useOncoCare();
  const { resources, bookings, loading, error, reload } = useInfusionAgenda();

  const [slotInput, setSlotInput] = useState(defaultSlotInput);
  const [hoursInput, setHoursInput] = useState("4");
  const [patientId, setPatientId] = useState("");
  const [medicationNotes, setMedicationNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const selected = useMemo(
    () => (resourceId ? resources.find((r) => r.id === resourceId) : undefined),
    [resourceId, resources]
  );

  const bookingsForResource = useMemo(() => {
    if (!resourceId) return [];
    return bookings
      .filter((b) => b.resource_id === resourceId)
      .sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at));
  }, [bookings, resourceId]);

  const agendaHint = useMemo(() => {
    if (!selected || selected.operational_status === "maintenance") return "Recurso em manutenção — não é possível agendar.";
    const t = Date.parse(slotInput);
    if (Number.isNaN(t)) return "Data/hora inválida.";
    const h = Number(hoursInput.replace(",", "."));
    if (!Number.isFinite(h) || h < 0.5 || h > 24) return "Informe a duração entre 0,5 e 24 horas.";
    const end = t + h * 60 * 60 * 1000;
    const clash = bookingOverlapsExisting(selected.id, t, end, bookings);
    return clash ? "Conflito: já existe reserva sobreposta neste horário." : "Horário livre — confirme para reservar.";
  }, [selected, slotInput, hoursInput, bookings]);

  if (!resourceId) {
    return (
      <div className="mx-auto max-w-lg text-center">
        <p className="text-muted-foreground">Identificador inválido.</p>
        <Button type="button" className="mt-4 rounded-2xl" variant="outline" asChild>
          <Link to="/agenda">Voltar à agenda</Link>
        </Button>
      </div>
    );
  }

  if (!loading && !selected) {
    return (
      <div className="mx-auto max-w-lg text-center">
        <p className="text-muted-foreground">Recurso não encontrado.</p>
        <Button type="button" className="mt-4 rounded-2xl" variant="outline" asChild>
          <Link to="/agenda">Voltar à agenda</Link>
        </Button>
      </div>
    );
  }

  async function toggleMaintenance() {
    if (!selected) return;
    setBusy(true);
    try {
      const next = selected.operational_status === "active" ? "maintenance" : "active";
      const { error: e } = await supabase.from("infusion_resources").update({ operational_status: next }).eq("id", selected.id);
      if (e) throw e;
      await reload();
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  }

  async function bookSlot() {
    if (!selected || selected.operational_status === "maintenance") return;
    const t = Date.parse(slotInput);
    if (Number.isNaN(t)) return;
    const h = Number(hoursInput.replace(",", "."));
    if (!Number.isFinite(h) || h < 0.5 || h > 24) return;
    const end = t + h * 60 * 60 * 1000;
    if (bookingOverlapsExisting(selected.id, t, end, bookings)) return;
    setBusy(true);
    try {
      const { error: e } = await supabase.from("infusion_resource_bookings").insert({
        resource_id: selected.id,
        patient_id: patientId || null,
        starts_at: new Date(t).toISOString(),
        ends_at: new Date(end).toISOString(),
        medication_notes: medicationNotes.trim() || null,
      });
      if (e) throw e;
      setMedicationNotes("");
      setPatientId("");
      await reload();
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  }

  async function removeBooking(id: string) {
    setBusy(true);
    try {
      const { error: e } = await supabase.from("infusion_resource_bookings").delete().eq("id", id);
      if (e) throw e;
      await reload();
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  }

  const Icon = selected?.kind === "chair" ? Armchair : BedDouble;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 pb-16">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          className="rounded-2xl border-[3px]"
          onClick={() => navigate("/agenda")}
        >
          <ArrowLeft className="mr-2 size-4" />
          Agenda
        </Button>
      </div>

      {error ? (
        <p className="rounded-2xl border-[3px] border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#B91C1C]">{error}</p>
      ) : null}
      {loading ? (
        <p className="text-sm text-muted-foreground">A carregar…</p>
      ) : selected ? (
        <>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="flex items-center gap-2 text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground">
                  <Icon className="size-4 opacity-80" />
                  {kindLabel(selected.kind)}
                </p>
                <h1 className="mt-1 text-3xl font-black tracking-tight">{selected.label}</h1>
                <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                  {selected.details?.trim() || "Sem notas de equipamento."} Reservas na janela carregada (últimos 7 dias e
                  próximos 45 dias).
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="rounded-2xl border-[3px] border-dashed"
                disabled={busy}
                onClick={() => void toggleMaintenance()}
              >
                <Wrench className="mr-2 size-4" />
                {selected.operational_status === "maintenance" ? "Disponibilizar recurso" : "Marcar manutenção"}
              </Button>
            </div>
          </motion.div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="rounded-[32px] border-[3px] border-[#F3F4F6] p-6">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Agendamentos</p>
              <ScrollArea className="mt-3 h-[min(420px,50vh)] rounded-2xl border-[3px] border-[#F3F4F6]">
                <ul className="divide-y divide-[#F3F4F6] p-2">
                  {bookingsForResource.length === 0 ? (
                    <li className="px-3 py-10 text-center text-sm text-muted-foreground">Nenhuma reserva neste período.</li>
                  ) : (
                    bookingsForResource.map((b: InfusionBookingRow) => (
                      <li key={b.id} className="flex flex-wrap items-start justify-between gap-2 px-3 py-3 text-sm">
                        <div>
                          <p className="font-semibold">
                            {new Date(b.starts_at).toLocaleString()} → {new Date(b.ends_at).toLocaleString()}
                          </p>
                          <p className="text-muted-foreground">Paciente: {patientDisplayName(b)}</p>
                          {b.medication_notes ? (
                            <p className="mt-1 text-xs text-muted-foreground">Medicação: {b.medication_notes}</p>
                          ) : null}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="shrink-0 rounded-xl text-[#B91C1C] hover:bg-[#FEF2F2]"
                          disabled={busy}
                          onClick={() => void removeBooking(b.id)}
                          aria-label="Remover reserva"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </li>
                    ))
                  )}
                </ul>
              </ScrollArea>
            </Card>

            <Card className="rounded-[32px] border-[3px] border-[#F3F4F6] p-6">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nova reserva</p>
              {selected.operational_status === "maintenance" ? (
                <p className="mt-4 text-sm text-muted-foreground">
                  Coloque o recurso como disponível (botão acima) para permitir agendamentos.
                </p>
              ) : (
                <>
                  <div className="mt-4 flex flex-col gap-3">
                    <label className="text-sm font-medium">
                      Início
                      <Input
                        type="datetime-local"
                        className="mt-1 rounded-2xl border-[3px]"
                        value={slotInput}
                        onChange={(e) => setSlotInput(e.target.value)}
                      />
                    </label>
                    <label className="text-sm font-medium">
                      Duração (horas)
                      <Input
                        type="number"
                        min={0.5}
                        max={24}
                        step={0.5}
                        className="mt-1 rounded-2xl border-[3px]"
                        value={hoursInput}
                        onChange={(e) => setHoursInput(e.target.value)}
                      />
                    </label>
                    <label className="text-sm font-medium">
                      Paciente (opcional)
                      <select
                        className={cn(
                          "mt-1 flex h-11 w-full rounded-2xl border-[3px] border-[#F3F4F6] bg-background px-3 text-sm",
                          "ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        )}
                        value={patientId}
                        onChange={(e) => setPatientId(e.target.value)}
                      >
                        <option value="">— reserva sem paciente —</option>
                        {patientRows.map((p) => {
                          const prof = p.profiles;
                          const nm = Array.isArray(prof) ? prof[0]?.full_name : prof?.full_name;
                          return (
                            <option key={p.id} value={p.id}>
                              {nm || p.id.slice(0, 8)}
                            </option>
                          );
                        })}
                      </select>
                    </label>
                    <label className="text-sm font-medium">
                      Medicação / protocolo previsto
                      <textarea
                        className="mt-1 min-h-[88px] w-full rounded-2xl border-[3px] border-[#F3F4F6] bg-background px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        placeholder="Ex.: FOLFOX — oxaliplatina, leucovorina, 5-FU…"
                        value={medicationNotes}
                        onChange={(e) => setMedicationNotes(e.target.value)}
                      />
                    </label>
                  </div>
                  <Button
                    type="button"
                    className="mt-4 w-full rounded-2xl"
                    disabled={busy || agendaHint.startsWith("Conflito") || agendaHint.startsWith("Recurso")}
                    onClick={() => void bookSlot()}
                  >
                    Confirmar reserva
                  </Button>
                  <p
                    className={`mt-3 text-sm ${
                      agendaHint.includes("Conflito") || agendaHint.includes("manutenção") || agendaHint.includes("inválida")
                        ? "font-semibold text-[#FF4D4D]"
                        : "text-muted-foreground"
                    }`}
                  >
                    {agendaHint}
                  </p>
                </>
              )}
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}
