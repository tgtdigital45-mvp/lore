import { Armchair, BedDouble, Snowflake } from "lucide-react";
import type { InfusionResourceRow } from "@/hooks/useInfusionAgenda";

type Props = {
  kind: InfusionResourceRow["kind"];
  cryo: boolean;
};

export function ResourceVisualIcons({ kind, cryo }: Props) {
  const MainIcon = kind === "chair" ? Armchair : BedDouble;
  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <span className="inline-flex size-9 items-center justify-center rounded-2xl bg-[#F1F5F9] text-[#334155] shadow-sm">
        <MainIcon className="size-[18px]" strokeWidth={2.25} />
      </span>
      {cryo ? (
        <span
          className="inline-flex size-9 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-100 to-sky-50 text-sky-600 ring-1 ring-sky-200/90 shadow-sm"
          title="Crioterapia de couro cabeludo (touca PAXMAN) nesta posição"
          role="img"
          aria-label="Crioterapia PAXMAN"
        >
          <Snowflake className="size-[18px]" strokeWidth={2.25} />
        </span>
      ) : null}
    </div>
  );
}
