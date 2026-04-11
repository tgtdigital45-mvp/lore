import type { NavigateFunction } from "react-router-dom";
import { tabToPath, type DashboardTab } from "../nav";
import type { HospitalMetaRow } from "../types/dashboard";
import {
  IconDashboard,
  IconGestao,
  IconIntegration,
  IconMessages,
  IconSettings,
  IconUsers,
} from "./DashboardIcons";

type Props = {
  navActive: DashboardTab;
  navigate: NavigateFunction;
  goToPacientes: () => void;
  closePatientModal: () => void;
  hospitalsMeta: HospitalMetaRow[];
  setSettingsHospitalId: (id: string | null) => void;
  hydrateSettingsFromHospital: (h: HospitalMetaRow) => void;
};

export function MainNavigation({
  navActive,
  navigate,
  goToPacientes,
  closePatientModal,
  hospitalsMeta,
  setSettingsHospitalId,
  hydrateSettingsFromHospital,
}: Props) {
  return (
    <ul className="nav-list">
      <li>
        <button
          type="button"
          className={`nav-item ${navActive === "painel" ? "active" : ""}`}
          onClick={() => {
            navigate(tabToPath("painel"));
            closePatientModal();
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        >
          <span className="nav-item__icon" aria-hidden>
            <IconDashboard />
          </span>
          <span className="nav-item__label">Painel</span>
        </button>
      </li>
      <li>
        <button type="button" className={`nav-item ${navActive === "pacientes" ? "active" : ""}`} onClick={goToPacientes}>
          <span className="nav-item__icon" aria-hidden>
            <IconUsers />
          </span>
          <span className="nav-item__label">Pacientes</span>
        </button>
      </li>
      <li>
        <button
          type="button"
          className={`nav-item ${navActive === "mensagens" ? "active" : ""}`}
          onClick={() => {
            navigate(tabToPath("mensagens"));
            closePatientModal();
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        >
          <span className="nav-item__icon" aria-hidden>
            <IconMessages />
          </span>
          <span className="nav-item__label">Mensagens</span>
        </button>
      </li>
      <li>
        <button
          type="button"
          className={`nav-item ${navActive === "integracao" ? "active" : ""}`}
          onClick={() => {
            navigate(tabToPath("integracao"));
            closePatientModal();
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        >
          <span className="nav-item__icon" aria-hidden>
            <IconIntegration />
          </span>
          <span className="nav-item__label">Integração</span>
        </button>
      </li>
      <li>
        <button
          type="button"
          className={`nav-item ${navActive === "gestao" ? "active" : ""}`}
          onClick={() => {
            navigate(tabToPath("gestao"));
            closePatientModal();
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        >
          <span className="nav-item__icon" aria-hidden>
            <IconGestao />
          </span>
          <span className="nav-item__label">Gestão</span>
        </button>
      </li>
      <li>
        <button
          type="button"
          className={`nav-item ${navActive === "configuracoes" ? "active" : ""}`}
          onClick={() => {
            navigate(tabToPath("configuracoes"));
            closePatientModal();
            window.scrollTo({ top: 0, behavior: "smooth" });
            const first = hospitalsMeta[0];
            if (first) {
              setSettingsHospitalId(first.id);
              hydrateSettingsFromHospital(first);
            }
          }}
        >
          <span className="nav-item__icon" aria-hidden>
            <IconSettings />
          </span>
          <span className="nav-item__label">Configurações</span>
        </button>
      </li>
    </ul>
  );
}
