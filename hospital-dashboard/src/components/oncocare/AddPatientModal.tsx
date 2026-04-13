import { useEffect } from "react";
import { X } from "lucide-react";
import { AddPatientByCodeCard } from "./AddPatientByCodeCard";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loadTriage: () => void | Promise<void>;
  hospitalId: string | null;
  hospitalOptions: { id: string; name: string }[];
};

export function AddPatientModal({ open, onOpenChange, loadTriage, hospitalId, hospitalOptions }: Props) {
  useEffect(() => {
    if (!open) return;
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onOpenChange(false);
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/45 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="max-h-[95vh] w-full max-w-2xl overflow-y-auto rounded-[32px] border border-[#E8EAED] bg-white p-2 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative">
          <button
            type="button"
            className="absolute right-4 top-4 z-10 rounded-xl p-2 text-muted-foreground hover:bg-[#F8FAFC]"
            aria-label="Fechar"
            onClick={() => onOpenChange(false)}
          >
            <X className="size-5" />
          </button>
          
          <div className="p-1">
            <AddPatientByCodeCard 
              loadTriage={async () => {
                await loadTriage();
                // Opcional: fechar ao sucesso? Normalmente melhor deixar aberto para ver a msg de OK.
              }}
              hospitalId={hospitalId}
              hospitalOptions={hospitalOptions}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
