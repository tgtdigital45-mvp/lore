"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, MessageSquare } from "lucide-react";
import { CANCER_PT } from "@/constants/dashboardLabels";
import { clinicalTier, TIER_ACCENT, type ClinicalTier } from "@/lib/clinicalTier";
import { latestVital } from "@/lib/vitalsSpark";
import type { RiskRow, VitalLogRow } from "@/types/dashboard";
import { profileName, profileDob, profileAvatarUrl, ageFromDob, initialsFromName } from "@/lib/dashboardProfile";
import { formatPatientCodeDisplay, maskPatientCodeDisplay } from "@/lib/patientCode";
import { formatPtShort, formatRelativeSince } from "@/lib/dashboardFormat";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PatientFaceThumb } from "./PatientFaceThumb";
import { patientWhatsappContact } from "@/lib/patientWhatsApp";

function spo2Color(v: number | null): string {
  if (v == null) return "#14B8A6";
  if (v < 94) return "#F59E0B";
  return "#14B8A6";
}

function suspensionRingColors(score: number): { borderColor: string; color: string } {
  if (score >= 50) return { borderColor: "#EF4444", color: "#EF4444" };
  if (score >= 25) return { borderColor: "#F59E0B", color: "#B45309" };
  return { borderColor: "#22C55E", color: "#15803D" };
}

function clinicalTierBadgeTitle(tier: ClinicalTier, row: Pick<RiskRow, "risk" | "hasClinicalAlert" | "is_in_nadir">): string {
  if (tier === "critical") {
    return `Crítico: risco≥4 ou alerta clínico. risk=${row.risk}, hasClinicalAlert=${row.hasClinicalAlert}. Ver clinicalTier.ts.`;
  }
  if (tier === "attention") {
    return `Atenção: risco≥2 ou nádir. risk=${row.risk}, is_in_nadir=${row.is_in_nadir}, hasClinicalAlert=${row.hasClinicalAlert}. Ver clinicalTier.ts.`;
  }
  return `Estável: risk=${row.risk}, is_in_nadir=${row.is_in_nadir}. Ver clinicalTier.ts.`;
}

type Props = {
  row: RiskRow;
  vitals: VitalLogRow[];
  /** Destaque estilo “item selecionado” na fila (painel de detalhe aberto). */
  isSelected?: boolean;
};

/**
 * Cartão da fila de triagem: clique abre o dossiê à direita (rota `/paciente/:id`).
 * No painel com layout dividido, `isSelected` ativa o conector visual até o painel.
 */
export function TriagePatientCard({ row, vitals, isSelected }: Props) {
  const router = useRouter();
  const tier = clinicalTier(row);
  const accent = TIER_ACCENT[tier];
  const suspensionScore = row.suspensionRiskScore;
  const suspensionColors = suspensionRingColors(suspensionScore);
  const lastSpo2 = latestVital(vitals, "spo2");
  const lastTemp = latestVital(vitals, "temperature");
  const lastHr = latestVital(vitals, "heart_rate");

  const name = profileName(row.profiles);
  const age = ageFromDob(profileDob(row.profiles));
  const code = formatPatientCodeDisplay(row.patient_code) ?? `PR-${row.id.slice(0, 8).toUpperCase()}`;
  const faceUrl = profileAvatarUrl(row.profiles);
  const faceInitials = initialsFromName(name);

  const statusTag =
    tier === "critical" ? "Crítico" : tier === "attention" ? "Atenção" : tier === "stable" ? "Estável" : "—";

  const dossierPath = `/paciente/${row.id}`;
  const messagesPath = `${dossierPath}?tab=mensagens`;
  const wa = patientWhatsappContact(row);
  const [patientCodeVisible, setPatientCodeVisible] = useState(true);

  return (
    <div className="relative">
      <motion.div
        whileTap={{ scale: 0.98 }}
        className={cn(
          "overflow-hidden rounded-2xl border bg-white shadow-card transition-all duration-300 ease-in-out",
          isSelected
            ? "border-l-4 border-lime-400 bg-lime-100 shadow-soft ring-2 ring-lime-300/60"
            : "border-slate-100 hover:-translate-y-0.5 hover:border-slate-200 hover:shadow-soft"
        )}
      >
        {!isSelected ? <div className="h-1 w-full shrink-0" style={{ background: accent }} aria-hidden /> : null}

        <div
          role="link"
          tabIndex={0}
          onClick={(e) => {
            if ((e.target as HTMLElement).closest("a, button")) return;
            void router.push(dossierPath);
          }}
          onKeyDown={(e) => {
            if ((e.target as HTMLElement).closest("a, button")) return;
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              void router.push(dossierPath);
            }
          }}
          className={cn(
            "block cursor-pointer p-4 outline-none transition-colors",
            "focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2",
            isSelected && "rounded-2xl"
          )}
          aria-current={isSelected ? "page" : undefined}
          aria-label={`Abrir dossiê de ${name}`}
        >
          <div className="flex gap-3">
            <PatientFaceThumb url={faceUrl} initials={faceInitials} className="h-12 w-12 shrink-0 text-sm shadow-sm ring-2 ring-white" />

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-start gap-2">
                <h3 className="text-[0.95rem] font-black leading-tight tracking-tight text-slate-900 sm:text-base">{name}</h3>
                {row.current_stage ? (
                  <Badge className="rounded-full border-0 bg-teal-100 px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide text-teal-800">
                    {row.current_stage}
                  </Badge>
                ) : null}
                <Badge
                  variant="secondary"
                  title={clinicalTierBadgeTitle(tier, row)}
                  className={cn(
                    "max-w-full cursor-help rounded-full px-2 py-0.5 text-[0.6rem] font-bold uppercase",
                    tier === "critical" && "bg-red-100 text-red-800",
                    tier === "attention" && "bg-amber-100 text-amber-900",
                    tier === "stable" && "bg-lime-200 text-lime-900"
                  )}
                >
                  {statusTag}
                </Badge>
              </div>
              <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[0.72rem] text-slate-500">
                <span className="inline-flex items-center gap-1 font-mono text-slate-700 tabular-nums">
                  {patientCodeVisible ? code : maskPatientCodeDisplay(code)}
                </span>
                <button
                  type="button"
                  className="inline-flex shrink-0 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                  aria-label={patientCodeVisible ? "Ocultar código do paciente" : "Mostrar código do paciente"}
                  aria-pressed={patientCodeVisible}
                  title={patientCodeVisible ? "Ocultar código" : "Mostrar código"}
                  onClick={(e) => {
                    e.stopPropagation();
                    setPatientCodeVisible((v) => !v);
                  }}
                >
                  {patientCodeVisible ? <EyeOff className="size-3.5" aria-hidden /> : <Eye className="size-3.5" aria-hidden />}
                </button>
                <span className="text-slate-500">· {age ?? "—"}</span>
              </p>
              <p className="mt-0.5 line-clamp-1 text-[0.72rem] text-slate-500">
                {CANCER_PT[row.primary_cancer_type] ?? row.primary_cancer_type}
              </p>
            </div>

            <div
              className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-full border-2 bg-white text-center shadow-sm"
              style={{ borderColor: suspensionColors.borderColor, color: suspensionColors.color }}
              title={`Risco de suspensão: ${suspensionScore}% (heurística)`}
            >
              <span className="text-sm font-black leading-none tabular-nums">{suspensionScore}</span>
            </div>
          </div>

          {row.lastSymptomAt ? (
            <p className="mt-2 text-right text-[0.65rem] text-slate-400">
              {formatRelativeSince(row.lastSymptomAt)} · {formatPtShort(row.lastSymptomAt)}
            </p>
          ) : (
            <p className="mt-2 text-right text-[0.65rem] text-slate-400">Sem sintomas recentes</p>
          )}

          <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-[0.72rem]">
            <span className="tabular-nums">
              <span className="font-semibold uppercase tracking-wide text-muted-foreground">Temp.</span>{" "}
              <span
                className="font-bold"
                style={{ color: lastTemp != null && lastTemp >= 38 ? "#EF4444" : "#0F172A" }}
              >
                {lastTemp != null ? `${lastTemp.toFixed(1)} °C` : "—"}
              </span>
            </span>
            <span className="tabular-nums">
              <span className="font-semibold uppercase tracking-wide text-muted-foreground">SpO₂</span>{" "}
              <span className="font-bold" style={{ color: spo2Color(lastSpo2) }}>
                {lastSpo2 != null ? `${Math.round(lastSpo2)} %` : "—"}
              </span>
            </span>
            <span className="tabular-nums">
              <span className="font-semibold uppercase tracking-wide text-muted-foreground">FC</span>{" "}
              <span className="font-bold text-indigo-600">
                {lastHr != null ? `${Math.round(lastHr)} bpm` : "—"}
              </span>
            </span>
          </div>

          {wa.canMessage ? (
            <div className="mt-2 flex justify-end">
              <Link
                href={messagesPath}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-white px-3 py-1.5 text-[0.72rem] font-bold text-teal-800 shadow-sm transition-colors hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
              >
                <MessageSquare className="size-3.5 shrink-0" strokeWidth={2} />
                Mensagens
              </Link>
            </div>
          ) : null}
        </div>
      </motion.div>

      {/* Conector visual: card selecionado → painel do dossiê à direita */}
      {isSelected ? (
        <div
          className="pointer-events-none absolute -right-3 top-1/2 z-20 hidden -translate-y-1/2 xl:flex xl:items-center"
          aria-hidden
        >
          <div className="flex items-center">
            <div className="h-1 w-4 rounded-full bg-gradient-to-r from-lime-400 to-lime-500 shadow-sm" />
            <div
              className="h-0 w-0 border-y-[9px] border-l-[11px] border-r-0 border-y-transparent border-l-white drop-shadow-sm"
              style={{ filter: "drop-shadow(1px 0 2px rgba(0,0,0,0.06))" }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
