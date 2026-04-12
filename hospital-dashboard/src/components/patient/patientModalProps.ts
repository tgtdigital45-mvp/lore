import type {
  BiomarkerModalRow,
  MedicalDocModalRow,
  MedicationLogRow,
  MergedAlertRules,
  ModalTabId,
  NutritionLogRow,
  OutboundMessageRow,
  RiskRow,
  SymptomLogDetail,
  TreatmentCycleRow,
  TreatmentInfusionRow,
  VitalLogRow,
  WaProfileSnap,
  WearableSampleRow,
} from "../../types/dashboard";

export type PatientModalProps = {
  modalPatient: RiskRow;
  onClose: () => void;
  modalTab: ModalTabId;
  onTabChange: (t: ModalTabId) => void;
  triageRules: MergedAlertRules;
  modalLoading: boolean;
  modalError: string | null;
  modalCycles: TreatmentCycleRow[];
  modalInfusions: TreatmentInfusionRow[];
  modalSymptoms: SymptomLogDetail[];
  modalVitals: VitalLogRow[];
  modalWearables: WearableSampleRow[];
  modalMedicationLogs: MedicationLogRow[];
  modalNutritionLogs: NutritionLogRow[];
  modalBiomarkers: BiomarkerModalRow[];
  modalMedicalDocs: MedicalDocModalRow[];
  modalOutbound: OutboundMessageRow[];
  modalWaProfile: WaProfileSnap | null;
  waCompose: string;
  onWaCompose: (v: string) => void;
  onSendWhatsApp: () => void;
  waSendBusy: boolean;
  waSendError: string | null;
  waSendOk: string | null;
  backendUrl: string;
  docOpenError: string | null;
  staffUploadBusy: boolean;
  staffUploadMsg: string | null;
  onStaffUpload: (file: File) => void;
  onOpenExam: (documentId: string, mode: "open" | "download") => void;
  expandedExamDocId: string | null;
  onExpandedExamDocId: (id: string | null) => void;
  examesTabLoading: boolean;
  displayName: string;
  displayInitials: string;
  ageLabel: string;
};
