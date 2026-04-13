import { Suspense, lazy, useEffect, useRef, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import type { ModalTabId } from "../../types/dashboard";
import { MODAL_TAB_LABEL } from "./modalTabLabels";
import type { PatientModalProps } from "./patientModalProps";

const PatientResumoPanel = lazy(() => import("./tabs/PatientResumoPanel"));
const PatientExamesPanel = lazy(() => import("./tabs/PatientExamesPanel"));
const PatientMensagensPanel = lazy(() => import("./tabs/PatientMensagensPanel"));
const PatientDiarioPanel = lazy(() => import("./tabs/PatientDiarioPanel"));

function TabFallback() {
  return <p className="muted patient-modal__loading">Carregando painel…</p>;
}

export function PatientModal(props: PatientModalProps) {
  const {
    modalPatient,
    onClose,
    modalTab,
    onTabChange,
    triageRules,
    modalLoading,
    modalError,
    modalCycles,
    modalInfusions,
    modalSymptoms,
    modalVitals,
    modalWearables,
    modalMedicationLogs,
    modalNutritionLogs,
    modalBiomarkers,
    modalMedicalDocs,
    modalOutbound,
    modalWaProfile,
    waCompose,
    onWaCompose,
    onSendWhatsApp,
    waSendBusy,
    waSendError,
    waSendOk,
    backendUrl,
    docOpenError,
    staffUploadBusy,
    staffUploadMsg,
    onStaffUpload,
    onOpenExam,
    expandedExamDocId,
    onExpandedExamDocId,
    examesTabLoading,
    displayName,
    displayInitials,
    displayAvatarUrl,
    ageLabel,
  } = props;

  const modalCloseRef = useRef<HTMLButtonElement>(null);
  const patientModalSheetRef = useRef<HTMLDivElement>(null);
  const patientModalDragRef = useRef<{ pointerId: number; startY: number } | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    modalCloseRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  useEffect(() => {
    patientModalDragRef.current = null;
    const el = patientModalSheetRef.current;
    if (el) {
      el.style.transform = "";
      el.style.transition = "";
    }
  }, [modalPatient.id]);

  const onPatientModalHeadPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest("button.patient-modal__close")) return;
    patientModalDragRef.current = { pointerId: e.pointerId, startY: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPatientModalHeadPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = patientModalDragRef.current;
    if (!d || e.pointerId !== d.pointerId) return;
    const dy = e.clientY - d.startY;
    const sheet = patientModalSheetRef.current;
    if (!sheet) return;
    if (dy > 0) {
      sheet.style.transition = "none";
      sheet.style.transform = `translateY(${dy}px)`;
    } else {
      sheet.style.transform = "";
    }
  };

  const endPatientModalDrag = (e: PointerEvent<HTMLDivElement>) => {
    const d = patientModalDragRef.current;
    if (!d || e.pointerId !== d.pointerId) return;
    patientModalDragRef.current = null;
    const sheet = patientModalSheetRef.current;
    const dy = e.clientY - d.startY;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    if (sheet) {
      sheet.style.transition = "";
      sheet.style.transform = "";
    }
    if (dy > 72) {
      onClose();
    }
  };

  const stageLabel = modalPatient.current_stage ? ` · Estágio: ${modalPatient.current_stage}` : "";

  return createPortal(
    <div className="patient-modal-backdrop" onClick={onClose}>
      <div
        ref={patientModalSheetRef}
        className="patient-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="patient-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="patient-modal__head patient-modal__head--draggable"
          onPointerDown={onPatientModalHeadPointerDown}
          onPointerMove={onPatientModalHeadPointerMove}
          onPointerUp={endPatientModalDrag}
          onPointerCancel={endPatientModalDrag}
        >
          <div className="patient-modal__handle" aria-hidden />
          <div className="patient-modal__head-main">
            <div className="patient-modal__identity">
              <div className="patient-modal__avatar" aria-hidden>
                {displayAvatarUrl ? (
                  <img src={displayAvatarUrl} alt="" referrerPolicy="no-referrer" className="patient-modal__avatar-img" />
                ) : (
                  displayInitials
                )}
              </div>
              <div>
                <h2 id="patient-modal-title" className="patient-modal__name">
                  {displayName}
                </h2>
                <p className="patient-modal__meta">
                  {ageLabel}
                  {stageLabel}
                </p>
              </div>
            </div>
            <button ref={modalCloseRef} type="button" className="patient-modal__close" onClick={onClose}>
              Fechar
            </button>
          </div>
        </div>

        <div className="patient-modal__tabs" role="tablist" aria-label="Seções do prontuário">
          {(Object.keys(MODAL_TAB_LABEL) as ModalTabId[]).map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={modalTab === id}
              className={`patient-modal__tab ${modalTab === id ? "is-active" : ""}`}
              onClick={() => onTabChange(id)}
            >
              {MODAL_TAB_LABEL[id]}
            </button>
          ))}
        </div>

        <div className="patient-modal__scroll">
          <Suspense fallback={<TabFallback />}>
            {modalTab === "resumo" ? (
              <PatientResumoPanel
                modalPatient={modalPatient}
                triageRules={triageRules}
                modalLoading={modalLoading}
                modalError={modalError}
                modalCycles={modalCycles}
                modalInfusions={modalInfusions}
                modalSymptoms={modalSymptoms}
                modalVitals={modalVitals}
                modalWearables={modalWearables}
                modalMedicationLogs={modalMedicationLogs}
                modalNutritionLogs={modalNutritionLogs}
              />
            ) : null}

            {modalTab === "exames" ? (
              <PatientExamesPanel
                patientId={modalPatient.id}
                modalLoading={examesTabLoading}
                modalMedicalDocs={modalMedicalDocs}
                modalBiomarkers={modalBiomarkers}
                expandedExamDocId={expandedExamDocId}
                onExpandedExamDocId={onExpandedExamDocId}
                backendUrl={backendUrl}
                docOpenError={docOpenError}
                staffUploadBusy={staffUploadBusy}
                staffUploadMsg={staffUploadMsg}
                onStaffUpload={onStaffUpload}
                onOpenExam={onOpenExam}
              />
            ) : null}

            {modalTab === "mensagens" ? (
              <PatientMensagensPanel
                backendUrl={backendUrl}
                modalWaProfile={modalWaProfile}
                waCompose={waCompose}
                onWaCompose={onWaCompose}
                onSendWhatsApp={onSendWhatsApp}
                waSendBusy={waSendBusy}
                waSendError={waSendError}
                waSendOk={waSendOk}
                modalOutbound={modalOutbound}
              />
            ) : null}

            {modalTab === "diario" ? <PatientDiarioPanel modalLoading={modalLoading} modalSymptoms={modalSymptoms} /> : null}
          </Suspense>

          <p className="patient-modal__audit-hint muted">Acesso ao prontuário registrado para conformidade (auditoria).</p>
        </div>
      </div>
    </div>,
    document.body
  );
}

export type { PatientModalProps } from "./patientModalProps";
