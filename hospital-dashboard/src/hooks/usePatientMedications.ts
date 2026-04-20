/**
 * Slice semântico: medicamentos (usa o mesmo estado que `usePatientParaclinical`).
 * Preferir importar `usePatientParaclinical` em novos código; este ficheiro existe para alinhar com a auditoria (SRP).
 */
export { usePatientParaclinical as usePatientMedications } from "./usePatientParaclinical";
export type { PatientParaclinicalState as PatientMedicationsState } from "./usePatientParaclinical";
