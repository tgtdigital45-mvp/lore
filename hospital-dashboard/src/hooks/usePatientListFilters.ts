import { useMemo, useState } from "react";
import { profileName } from "../lib/dashboardProfile";
import type { RiskRow } from "../types/dashboard";

export function usePatientListFilters(rows: RiskRow[]) {
  const [filterCancer, setFilterCancer] = useState("");
  const [filterAlertOnly, setFilterAlertOnly] = useState(false);
  const [patientSearch, setPatientSearch] = useState("");

  const filtered = useMemo(() => {
    if (!filterCancer) return rows;
    return rows.filter((r) => r.primary_cancer_type === filterCancer);
  }, [rows, filterCancer]);

  const searchFiltered = useMemo(() => {
    let list = filtered;
    if (filterAlertOnly) list = list.filter((r) => r.hasClinicalAlert);
    const q = patientSearch.trim().toLowerCase();
    if (!q) return list;
    return list.filter((r) => profileName(r.profiles).toLowerCase().includes(q));
  }, [filtered, patientSearch, filterAlertOnly]);

  const cancerOptions = useMemo(() => {
    const s = new Set(rows.map((r) => r.primary_cancer_type));
    return [...s].sort();
  }, [rows]);

  const attentionPatients = useMemo(
    () => searchFiltered.filter((r) => r.hasClinicalAlert || r.risk >= 3).slice(0, 8),
    [searchFiltered]
  );

  return {
    filterCancer,
    setFilterCancer,
    filterAlertOnly,
    setFilterAlertOnly,
    patientSearch,
    setPatientSearch,
    filtered,
    searchFiltered,
    cancerOptions,
    attentionPatients,
  };
}
