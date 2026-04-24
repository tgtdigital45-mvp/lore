import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  children?: React.ReactNode;
  className?: string;
};

/** Texto + ícone para estados de carregamento em painéis e modais. */
export function LoadingInline({ children = "Carregando…", className }: Props) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-muted-foreground", className)}>
      <Loader2 className="size-3.5 shrink-0 animate-spin opacity-90" aria-hidden />
      <span>{children}</span>
    </span>
  );
}
