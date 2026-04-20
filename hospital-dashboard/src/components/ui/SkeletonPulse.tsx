import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  /** Altura Tailwind, ex: h-24 */
  rounded?: "xl" | "2xl" | "3xl" | "[32px]";
};

/**
 * Bloco de placeholder com shimmer (melhor que `animate-pulse` plano).
 */
export function SkeletonPulse({ className, rounded = "2xl" }: Props) {
  const r =
    rounded === "xl"
      ? "rounded-xl"
      : rounded === "3xl"
        ? "rounded-3xl"
        : rounded === "[32px]"
          ? "rounded-[32px]"
          : "rounded-2xl";
  return <div className={cn("skeleton-shimmer min-h-[1rem]", r, className)} role="presentation" />;
}
