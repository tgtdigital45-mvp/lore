"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Phone,
  ArrowUpRight,
  Activity,
  Stethoscope,
} from "lucide-react";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { symptomCategoryLabel, symptomSeverityLabel } from "@/lib/patientModalHelpers";
import { formatPtShort } from "@/lib/dashboardFormat";
import type { SymptomLogDetail, PatientAppointmentRow, MedicalDocModalRow, RiskRow } from "@/types/dashboard";

interface StaffProfileSlice {
  full_name: string;
  avatar_url: string | null;
  specialty: string | null;
}

interface ModernPatientDossierProps {
  patientId: string;
  nadir?: {
    cycleLabel: string;
    estimatedNadirWindowLabel: string;
  };
  symptoms?: SymptomLogDetail[];
  appointments?: PatientAppointmentRow[];
  medicalDocs?: MedicalDocModalRow[];
  staffProfile: StaffProfileSlice | null;
  /** Present when parent finished loading; guard for HMR / partial props. */
  riskRow?: RiskRow;
}

/** Severity ordering for computing max. */
const SEVERITY_ORDER: Record<string, number> = {
  life_threatening: 4,
  severe: 3,
  moderate: 2,
  mild: 1,
};

function maxSeveritySymptom(symptoms: SymptomLogDetail[]): SymptomLogDetail | null {
  return symptoms.reduce<SymptomLogDetail | null>((best, s) => {
    const rank = SEVERITY_ORDER[s.severity ?? ""] ?? 0;
    const bestRank = SEVERITY_ORDER[best?.severity ?? ""] ?? 0;
    return rank > bestRank ? s : best;
  }, null);
}

/** Return up to `n` distinct non-null symptom category labels from symptoms array. */
function distinctCategoryLabels(symptoms: SymptomLogDetail[], n: number): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const s of symptoms) {
    const label = symptomCategoryLabel(s);
    if (!seen.has(label)) {
      seen.add(label);
      result.push(label);
    }
    if (result.length >= n) break;
  }
  return result;
}

/** Returns the 7-day window centred on today: [today-3 … today+3]. */
function weekWindow(): number[] {
  const today = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - 3 + i);
    return d.getDate();
  });
}

export function ModernPatientDossier({
  symptoms = [],
  appointments = [],
  medicalDocs = [],
  staffProfile,
  riskRow,
}: ModernPatientDossierProps) {
  const today = useMemo(() => new Date(), []);
  const todayDay = today.getDate();
  const weekDays = useMemo(() => weekWindow(), []);

  const todayLabel = today.toLocaleDateString("pt-BR");

  // --- Symptoms ---
  const latestSymptom = symptoms[0] ?? null;
  const maxSym = useMemo(() => maxSeveritySymptom(symptoms), [symptoms]);
  const categoryTags = useMemo(() => distinctCategoryLabels(symptoms, 5), [symptoms]);
  const latestCategory = latestSymptom ? symptomCategoryLabel(latestSymptom) : "—";
  const latestSeverityLabelValue = latestSymptom ? symptomSeverityLabel(latestSymptom) : "—";
  const maxCategory = maxSym ? symptomCategoryLabel(maxSym) : "—";
  const latestSymptomDateLabel = latestSymptom ? formatPtShort(latestSymptom.logged_at) : "—";

  // --- Risk bar segments (map 0–100 score to 0–3 filled segments) ---
  const riskScore = riskRow?.risk ?? 0;
  const filledSegments = Math.round((riskScore / 100) * 3);

  // --- Current severity segments (map severity rank 0–4 to 0–3 filled) ---
  const currentSeverityRank = SEVERITY_ORDER[latestSymptom?.severity ?? ""] ?? 0;
  const currentFilled = Math.round((currentSeverityRank / 4) * 3);

  // --- Appointments (upcoming only, sorted, capped at 4) ---
  const upcomingAppts = useMemo(
    () =>
      [...appointments]
        .filter((a) => new Date(a.starts_at).getTime() >= Date.now() - 24 * 60 * 60 * 1000)
        .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
        .slice(0, 4),
    [appointments]
  );

  // --- Medical docs ---
  const firstDoc = medicalDocs[0] ?? null;
  const firstDocDate = firstDoc ? formatPtShort(firstDoc.uploaded_at) : "—";
  const firstDocTitle =
    (firstDoc?.ai_extracted_json?.["title"] as string | undefined) ??
    firstDoc?.document_type ??
    null;

  // --- Staff profile ---
  const doctorName = staffProfile?.full_name ?? "—";
  const doctorSpecialty = staffProfile?.specialty ?? "—";
  const doctorAvatar = staffProfile?.avatar_url ?? null;
  const doctorInitials = doctorName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => (w.length > 0 ? [...w][0] : ""))
    .join("")
    .toUpperCase();

  return (
    <div className="grid w-full grid-cols-1 gap-[clamp(12px,1.5vw,24px)] p-[clamp(12px,1.5vw,24px)] md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:grid-cols-[repeat(12,minmax(0,1fr))]">

      {/* ── COLUNA ESQUERDA ── */}
      <div className="flex flex-col gap-4 md:col-span-1 xl:col-span-3 xl:gap-6">

        {/* Adicionar Nova Queixa */}
        <Card className="w-full min-w-0 overflow-hidden rounded-[24px] border-slate-100 bg-white/90 p-[clamp(12px,1.2vw,20px)] shadow-sm transition-all hover:shadow-md">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[clamp(13px,0.9vw,15px)] font-bold text-slate-900">Adicionar queixa</h3>
            <div className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200">
              <Plus className="h-4 w-4" />
            </div>
          </div>
          <p className="mb-4 text-[clamp(10px,0.7vw,12px)] font-medium uppercase tracking-wider text-slate-400">
            {todayLabel}
          </p>
          <div className="flex gap-2">
            <Button size="sm" className="h-8 flex-1 rounded-full bg-blue-600 text-[clamp(10px,0.7vw,12px)] font-bold text-white hover:bg-blue-700">
              MANUAL
            </Button>
            <Button variant="ghost" size="sm" className="h-8 flex-1 rounded-full bg-slate-50 text-[clamp(10px,0.7vw,12px)] font-bold text-slate-600 hover:bg-slate-100">
              HPI
            </Button>
          </div>
        </Card>

        {/* Calendário */}
        <Card className="w-full min-w-0 overflow-hidden rounded-[24px] border-slate-100 bg-white/90 p-[clamp(12px,1.2vw,20px)] shadow-sm transition-all hover:shadow-md">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[clamp(13px,0.9vw,15px)] font-bold text-slate-900">Calendário</h3>
            <div className="flex gap-1">
              <div className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border border-slate-100 text-slate-400 hover:text-slate-600">
                <ChevronLeft className="h-3 w-3" />
              </div>
              <div className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border border-slate-100 text-slate-400 hover:text-slate-600">
                <ChevronRight className="h-3 w-3" />
              </div>
            </div>
          </div>
          <p className="mb-4 text-[clamp(10px,0.7vw,12px)] font-medium uppercase tracking-wider text-slate-400">
            {todayLabel}
          </p>
          <div className="flex justify-between gap-1">
            {weekDays.map((day) => (
              <div
                key={day}
                className={cn(
                  "flex h-9 w-8 flex-col items-center justify-center rounded-2xl text-[clamp(10px,0.7vw,12px)] font-bold transition-all",
                  day === todayDay
                    ? "bg-slate-900 text-white shadow-lg"
                    : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                )}
              >
                {day}
              </div>
            ))}
          </div>
        </Card>

        {/* Perfil do Médico responsável */}
        <Card className="relative w-full min-w-0 overflow-hidden rounded-[24px] border-slate-100 bg-white/90 p-[clamp(12px,1.2vw,20px)] shadow-sm transition-all hover:shadow-md">
          <div className="absolute right-4 top-4">
            <ArrowUpRight className="h-4 w-4 text-slate-300" />
          </div>
          <div className="mb-4 flex flex-col items-center text-center">
            <div className="relative mb-3 h-20 w-20 overflow-hidden rounded-full ring-4 ring-slate-50">
              {doctorAvatar ? (
                <Image
                  src={doctorAvatar}
                  alt={doctorName}
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-slate-200 text-lg font-black text-slate-600">
                  {doctorInitials || "?"}
                </div>
              )}
            </div>
            <h3 className="line-clamp-2 text-[clamp(15px,1vw,18px)] font-black leading-tight text-slate-900">{doctorName}</h3>
            <div className="mt-2 flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1">
              <Stethoscope className="h-3 w-3 text-blue-500" />
              <span className="text-[clamp(10px,0.7vw,12px)] font-bold text-slate-600">{doctorSpecialty}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-9 flex-1 rounded-full border-slate-100 text-[clamp(10px,0.7vw,12px)] font-bold hover:bg-slate-50">
              <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
              MENSAGEM
            </Button>
            <Button variant="outline" size="sm" className="h-9 flex-1 rounded-full border-slate-100 text-[clamp(10px,0.7vw,12px)] font-bold hover:bg-slate-50">
              <Phone className="mr-1.5 h-3.5 w-3.5" />
              LIGAR
            </Button>
          </div>
        </Card>

        {/* Agendamentos */}
        <Card className="w-full min-w-0 overflow-hidden rounded-[24px] border-slate-100 bg-white/90 p-[clamp(12px,1.2vw,20px)] shadow-sm transition-all hover:shadow-md">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[clamp(13px,0.9vw,15px)] font-bold text-slate-900">Agendamentos</h3>
            <ArrowUpRight className="h-4 w-4 text-slate-300" />
          </div>
          <p className="mb-4 text-[clamp(10px,0.7vw,12px)] font-bold uppercase tracking-wider text-slate-400">
            {upcomingAppts.length > 0
              ? `${upcomingAppts.length} próximo(s)`
              : "Sem agendamentos"}
          </p>
          {upcomingAppts.length > 0 ? (
            <div className="flex flex-col gap-2">
              {upcomingAppts.map((appt) => (
                <div key={appt.id} className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2">
                  <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[0.6rem] font-bold text-slate-700">{appt.title}</p>
                    <p className="text-[0.55rem] text-slate-400">{formatPtShort(appt.starts_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {["Consulta", "Exames", "Labs", "Imagem"].map((label) => (
                <div key={label} className="flex items-center gap-2 rounded-2xl bg-slate-50 p-2 text-[0.6rem] font-bold text-slate-400">
                  <div className="h-1.5 w-1.5 rounded-full bg-slate-200" />
                  {label}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* ── COLUNA CENTRAL (CORPO ANATÔMICO) ──
           Tablet: full-width row below left+right (order-3)
           Desktop: middle column (order resets) */}
      <div className="relative flex min-h-[clamp(300px,40vh,360px)] flex-col items-center justify-center md:order-3 md:col-span-2 md:min-h-[clamp(280px,35vh,300px)] xl:order-none xl:col-span-5 xl:min-h-[clamp(400px,55vh,600px)]">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative h-full w-full min-h-[300px] xl:min-h-[500px]"
        >
          <Image
            src="/assets/anatomical_body.png"
            alt="Modelo Anatômico"
            fill
            sizes="(max-width: 1023px) 100vw, 42vw"
            className="object-contain"
            priority
          />

          {/* Pulse hotspots — decorative, no real body-location data in schema */}
          <div className="absolute left-[48%] top-[25%] flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/20 backdrop-blur-sm">
            <div className="h-4 w-4 animate-pulse rounded-full bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.6)]" />
          </div>
          <div className="absolute left-[58%] top-[40%] flex h-6 w-6 items-center justify-center rounded-full bg-slate-400/20 backdrop-blur-sm">
            <div className="h-2.5 w-2.5 rounded-full bg-slate-400" />
          </div>
          <div className="absolute left-[42%] top-[55%] flex h-6 w-6 items-center justify-center rounded-full bg-slate-400/20 backdrop-blur-sm">
            <div className="h-2.5 w-2.5 rounded-full bg-slate-400" />
          </div>
        </motion.div>

        {/* View switcher — decorative */}
        <div className="mt-4 flex gap-2 rounded-full bg-white/80 p-1 shadow-sm backdrop-blur-sm">
          <div className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-slate-900 text-white shadow-md">
            <ChevronLeft className="h-4 w-4" />
          </div>
          <div className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <ChevronRight className="h-4 w-4" />
          </div>
        </div>
      </div>

      {/* ── COLUNA DIREITA ── */}
      <div className="flex flex-col gap-4 md:col-span-1 xl:col-span-4 xl:gap-6">

        {/* Queixa principal */}
        <Card className="w-full min-w-0 overflow-hidden rounded-[24px] border-slate-100 bg-white/90 p-[clamp(12px,1.2vw,20px)] shadow-sm transition-all hover:shadow-md">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[clamp(13px,0.9vw,15px)] font-bold text-slate-900">Queixa principal</h3>
            <ArrowUpRight className="h-4 w-4 text-slate-300" />
          </div>
          <p className="mb-4 text-[clamp(10px,0.7vw,12px)] font-bold uppercase tracking-wider text-slate-400">
            {latestCategory}
          </p>
          <div className="flex flex-wrap gap-2">
            {categoryTags.length > 0 ? (
              categoryTags.map((tag) => (
                <Badge key={tag} variant="outline" className="rounded-full border-slate-100 bg-slate-50 px-3 py-1 text-[0.6rem] font-bold text-slate-600">
                  {tag}
                </Badge>
              ))
            ) : (
              <span className="text-[0.65rem] text-slate-400">Sem sintomas registrados</span>
            )}
          </div>
        </Card>

        {/* Detalhes clínicos */}
        <Card className="w-full min-w-0 overflow-hidden rounded-[24px] border-slate-100 bg-white/90 p-[clamp(12px,1.2vw,20px)] shadow-sm transition-all hover:shadow-md">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[clamp(13px,0.9vw,15px)] font-bold text-slate-900">Detalhes</h3>
            <ArrowUpRight className="h-4 w-4 text-slate-300" />
          </div>
          <p className="mb-4 text-[clamp(10px,0.7vw,12px)] font-bold uppercase tracking-wider text-slate-400">
            {riskRow?.primary_cancer_type ?? "—"}
          </p>
          <div className="space-y-4">
            <div>
              <p className="mb-1 text-[clamp(10px,0.7vw,12px)] font-bold uppercase text-slate-900">Último registro</p>
              <p className="mb-2 text-[clamp(10px,0.7vw,12px)] text-slate-400">{latestSymptomDateLabel}</p>
              {doctorName !== "—" && (
                <div className="mb-3 flex items-center gap-2">
                  <div className="h-5 w-5 overflow-hidden rounded-full border border-slate-100 shrink-0">
                    {doctorAvatar ? (
                      <Image src={doctorAvatar} alt={doctorName} width={20} height={20} className="object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-slate-200 text-[0.45rem] font-black text-slate-600">
                        {doctorInitials}
                      </div>
                    )}
                  </div>
                  <span className="text-[clamp(10px,0.7vw,12px)] font-bold text-slate-600 truncate">{doctorName}</span>
                </div>
              )}
              <p className="text-[clamp(11px,0.8vw,14px)] leading-relaxed text-slate-500">
                {latestSymptom?.notes
                  ? latestSymptom.notes.length > 120
                    ? `${latestSymptom.notes.slice(0, 120)}…`
                    : latestSymptom.notes
                  : latestSymptom
                    ? `Sintoma: ${latestCategory} — Gravidade: ${latestSeverityLabelValue}`
                    : "Sem notas clínicas registradas."}
              </p>
            </div>
          </div>
        </Card>

        {/* Documentos / imagem clínica */}
        <Card className="w-full min-w-0 overflow-hidden rounded-[24px] border-slate-100 bg-white/90 p-[clamp(12px,1.2vw,20px)] shadow-sm transition-all hover:shadow-md">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-[clamp(13px,0.9vw,15px)] font-bold text-slate-900">Documentos</h3>
            <ArrowUpRight className="h-4 w-4 text-slate-300" />
          </div>
          <p className="mb-3 text-[clamp(10px,0.7vw,12px)] font-medium uppercase tracking-wider text-slate-400">
            {firstDocDate}
          </p>
          {/* Dark placeholder — real image preview requires storage URL (future work) */}
          <div className="relative h-28 w-full overflow-hidden rounded-2xl bg-slate-900">
            <div className="absolute inset-0 flex items-center justify-center opacity-30">
              <Activity className="h-12 w-12 text-white" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-blue-900/40 to-transparent" />
          </div>
          <div className="mt-3 flex items-center justify-between">
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-[0.6rem] font-bold text-slate-900">
                {firstDocTitle ?? (medicalDocs.length === 0 ? "Sem documentos" : "Documento clínico")}
              </span>
              <span className="text-[0.55rem] text-slate-400">{firstDocDate}</span>
            </div>
            <div className="ml-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
              <ArrowUpRight className="h-3 w-3" />
            </div>
          </div>
        </Card>

        {/* Gravidade (Max / Atual) */}
        <div className="grid grid-cols-2 gap-[clamp(8px,1vw,16px)]">
          <Card className="w-full min-w-0 overflow-hidden rounded-[24px] border-slate-100 bg-white/90 p-[clamp(10px,1vw,16px)] shadow-sm transition-all hover:shadow-md">
            <h3 className="mb-1 text-[clamp(10px,0.7vw,12px)] font-bold uppercase text-slate-900">Max Gravidade</h3>
            <p className="mb-3 truncate text-[clamp(9px,0.6vw,11px)] text-slate-400">{maxCategory}</p>
            <div className="flex h-1.5 w-full gap-1 overflow-hidden">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className={cn(
                    "h-full flex-1 rounded-full",
                    i < filledSegments ? "bg-slate-900" : "bg-slate-100"
                  )}
                />
              ))}
            </div>
            <p className="mt-2 text-[clamp(10px,0.7vw,12px)] font-bold text-slate-900">{riskRow?.riskLabel ?? "—"}</p>
          </Card>

          <Card className="w-full min-w-0 overflow-hidden rounded-[24px] border-slate-100 bg-white/90 p-[clamp(10px,1vw,16px)] shadow-sm transition-all hover:shadow-md">
            <h3 className="mb-1 text-[clamp(10px,0.7vw,12px)] font-bold uppercase text-slate-900">Gravidade Atual</h3>
            <p className="mb-3 truncate text-[clamp(9px,0.6vw,11px)] text-slate-400">{latestCategory}</p>
            <div className="flex h-1.5 w-full gap-1 overflow-hidden">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className={cn(
                    "h-full flex-1 rounded-full",
                    i < currentFilled ? "bg-slate-900" : "bg-slate-100"
                  )}
                />
              ))}
            </div>
            <p className="mt-2 text-[clamp(10px,0.7vw,12px)] font-bold text-slate-900">{latestSeverityLabelValue}</p>
          </Card>
        </div>

      </div>

    </div>
  );
}
