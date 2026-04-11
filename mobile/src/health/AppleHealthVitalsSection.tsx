import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { collectAndSyncAppleHealth } from "@/src/health/appleHealthSnapshot";
import { HealthRow } from "@/src/health/components/HealthRow";
import { usePatient } from "@/src/hooks/usePatient";
import type { AppTheme } from "@/src/theme/theme";

type Props = { theme: AppTheme };

export function AppleHealthVitalsSection({ theme }: Props) {
  const { patient } = usePatient();
  const [heartRate, setHeartRate] = useState<string | null>(null);
  const [spo2, setSpo2] = useState<string | null>(null);
  const [hrv, setHrv] = useState<string | null>(null);
  const [falls, setFalls] = useState<string | null>(null);
  const [steadiness, setSteadiness] = useState<string | null>(null);
  const firstLoad = useRef(true);

  const load = useCallback(async () => {
    if (firstLoad.current) {
      setHeartRate(null);
      setSpo2(null);
      setHrv(null);
      setFalls(null);
      setSteadiness(null);
    }
    try {
      const d = await collectAndSyncAppleHealth(patient?.id);
      if (!d) {
        const dash = "—";
        setHeartRate(dash);
        setSpo2(dash);
        setHrv(dash);
        setFalls(dash);
        setSteadiness(dash);
        return;
      }
      setHeartRate(d.heartRate);
      setSpo2(d.spo2);
      setHrv(d.hrv);
      setFalls(d.falls);
      setSteadiness(d.steadiness);
    } catch {
      const dash = "—";
      setHeartRate(dash);
      setSpo2(dash);
      setHrv(dash);
      setFalls(dash);
      setSteadiness(dash);
    } finally {
      firstLoad.current = false;
    }
  }, [patient?.id]);

  useFocusEffect(
    useCallback(() => {
      void load();
      return undefined;
    }, [load])
  );

  const pending =
    heartRate === null || spo2 === null || hrv === null || falls === null || steadiness === null;
  const display = (v: string | null) => (pending ? "…" : (v ?? "—"));

  return (
    <>
      <HealthRow
        theme={theme}
        icon="heartbeat"
        iconTint={theme.colors.semantic.vitals}
        title="Frequência cardíaca"
        subtitle={patient?.id ? "Apple Saúde · sincronizado com o Onco" : "Apple Saúde (última leitura)"}
        value={display(heartRate)}
        showDivider
      />
      <HealthRow
        theme={theme}
        icon="tint"
        iconTint={theme.colors.semantic.respiratory}
        title="Oxigênio no sangue"
        subtitle="Apple Saúde (SpO₂)"
        value={display(spo2)}
        showDivider
      />
      <HealthRow
        theme={theme}
        icon="area-chart"
        iconTint={theme.colors.semantic.vitals}
        title="Variabilidade cardíaca (VFC)"
        subtitle="SDNN — Apple Saúde"
        value={display(hrv)}
        showDivider
      />
      <HealthRow
        theme={theme}
        icon="ambulance"
        iconTint={theme.colors.semantic.vitals}
        title="Quedas (Apple Saúde)"
        subtitle="N.º de quedas no intervalo registado"
        value={display(falls)}
        showDivider
      />
      <HealthRow
        theme={theme}
        icon="warning"
        iconTint={theme.colors.semantic.symptoms}
        title="Estabilidade ao caminhar"
        subtitle="Eventos Apple (mobilidade / risco)"
        value={display(steadiness)}
        showDivider={false}
      />
    </>
  );
}
