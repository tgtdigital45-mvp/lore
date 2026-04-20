/**
 * Slice semântico: exames/biomarcadores (usa o mesmo estado que `usePatientParaclinical`).
 */
export { usePatientParaclinical as usePatientExams } from "./usePatientParaclinical";
export type { PatientParaclinicalState as PatientExamsState } from "./usePatientParaclinical";
