import { formatPtDateTime } from "../../../lib/dashboardFormat";
import type { OutboundMessageRow, WaProfileSnap } from "../../../types/dashboard";

const OUTBOUND_STATUS_PT: Record<string, string> = {
  pending: "Pendente",
  sent: "Enviada",
  delivered: "Entregue",
  read: "Lida",
  failed: "Falhou",
};

type Props = {
  backendUrl: string;
  modalWaProfile: WaProfileSnap | null;
  waCompose: string;
  onWaCompose: (v: string) => void;
  onSendWhatsApp: () => void;
  waSendBusy: boolean;
  waSendError: string | null;
  waSendOk: string | null;
  modalOutbound: OutboundMessageRow[];
};

export default function PatientMensagensPanel({
  backendUrl,
  modalWaProfile,
  waCompose,
  onWaCompose,
  onSendWhatsApp,
  waSendBusy,
  waSendError,
  waSendOk,
  modalOutbound,
}: Props) {
  return (
    <div className="patient-modal__tab-panel">
      <section className="patient-modal__section" style={{ borderTop: "none", paddingTop: 0 }}>
        <h3 className="patient-modal__section-title">WhatsApp (institucional)</h3>
        <p className="patient-modal__micro-label">
          Envio via backend (Cloud API). Requer opt-in LGPD e telefone E.164 no perfil do paciente.
        </p>
        {!backendUrl ? (
          <p className="patient-modal__empty-hint">
            Indique o URL do onco-backend no menu <strong>Integração</strong> ou em <code className="patient-modal__code">VITE_BACKEND_URL</code> no .env.
          </p>
        ) : modalWaProfile && !modalWaProfile.optIn ? (
          <p className="patient-modal__empty-hint">
            Paciente sem consentimento ativo para WhatsApp. O envio está bloqueado até opt-in no app ou cadastro autorizado.
          </p>
        ) : modalWaProfile && !modalWaProfile.phone_e164 ? (
          <p className="patient-modal__empty-hint">Sem telefone E.164 no perfil — cadastre o número para enviar mensagens.</p>
        ) : (
          <>
            <label className="patient-modal__wa-label">
              Mensagem
              <textarea
                className="patient-modal__wa-text"
                rows={3}
                value={waCompose}
                onChange={(e) => onWaCompose(e.target.value)}
                placeholder="Texto da mensagem (sandbox/template conforme Meta)…"
                maxLength={4096}
              />
            </label>
            <div className="patient-modal__wa-actions">
              <button type="button" className="btn-solid" disabled={waSendBusy} onClick={() => void onSendWhatsApp()}>
                {waSendBusy ? "Enviando…" : "Enviar via WhatsApp"}
              </button>
            </div>
            {waSendError ? (
              <p className="error" role="alert" style={{ marginTop: "0.5rem" }}>
                {waSendError}
              </p>
            ) : null}
            {waSendOk ? (
              <p className="info" style={{ marginTop: "0.5rem", marginBottom: 0 }}>
                {waSendOk}
              </p>
            ) : null}
          </>
        )}
        <div className="patient-modal__table-wrap" style={{ marginTop: "1rem" }}>
          <p className="patient-modal__micro-label">Últimos envios</p>
          {modalOutbound.length === 0 ? (
            <p className="muted" style={{ margin: "0.25rem 0 0" }}>
              Nenhum registro.
            </p>
          ) : (
            <table className="patient-modal__table patient-modal__table--compact">
              <thead>
                <tr>
                  <th>Quando</th>
                  <th>Estado</th>
                  <th>Prévia</th>
                </tr>
              </thead>
              <tbody>
                {modalOutbound.map((m) => (
                  <tr key={m.id}>
                    <td>{formatPtDateTime(m.created_at)}</td>
                    <td>
                      <span className={`pill pill--compact ${m.status === "failed" ? "risk-critical" : "risk-low"}`}>
                        {OUTBOUND_STATUS_PT[m.status] ?? m.status}
                      </span>
                    </td>
                    <td className="patient-modal__wa-preview">
                      {m.error_detail ? (
                        <span className="muted" title={m.error_detail}>
                          {m.error_detail.length > 100 ? `${m.error_detail.slice(0, 100)}…` : m.error_detail}
                        </span>
                      ) : (
                        (m.body ?? "—").length > 120 ? `${(m.body ?? "").slice(0, 120)}…` : (m.body ?? "—")
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
