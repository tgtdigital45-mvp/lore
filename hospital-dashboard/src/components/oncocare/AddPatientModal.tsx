import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { AddPatientByCodeCard } from "./AddPatientByCodeCard";
import { modalOverlayTransition, modalPanelTransition } from "@/lib/motionPresets";

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

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="add-patient-overlay"
          className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-900/40 p-4 backdrop-blur-[6px] sm:items-center"
          role="dialog"
          aria-modal="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={modalOverlayTransition}
          onClick={() => onOpenChange(false)}
        >
          <motion.div
            className="max-h-[95vh] w-full max-w-2xl overflow-y-auto rounded-[32px] border border-[#E8EAED] bg-white p-2 shadow-2xl"
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={modalPanelTransition}
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
                  }}
                  hospitalId={hospitalId}
                  hospitalOptions={hospitalOptions}
                />
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
