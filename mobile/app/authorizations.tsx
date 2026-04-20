import { useCallback, useEffect, useMemo } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/src/lib/supabase";
import { usePatient } from "@/src/hooks/usePatient";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { ResponsiveScreen } from "@/src/components/ResponsiveScreen";

type LinkRow = {
  id: string;
  status: string;
  permission_level: string;
  requested_at: string;
  responded_at: string | null;
  access_valid_until: string | null;
  hospitals: { name: string } | { name: string }[] | null;
};

type EventRow = {
  id: string;
  event_type: string;
  prior_status: string | null;
  new_status: string;
  created_at: string;
  access_valid_until: string | null;
  hospitals: { name: string } | { name: string }[] | null;
};

const EVENT_LABEL: Record<string, string> = {
  created: "Pedido criado",
  reopened: "Novo pedido",
  approved: "Você aprovou",
  rejected: "Você recusou",
  revoked: "Acesso revogado",
  status_changed: "Estado alterado",
};

export default function AuthorizationsScreen() {
  const { theme } = useAppTheme();
  const { patient } = usePatient();
  const qc = useQueryClient();

  const patientId = patient?.id;

  const { data: links, isLoading, error, refetch } = useQuery({
    queryKey: ["patient_hospital_links", patientId],
    enabled: Boolean(patientId),
    queryFn: async (): Promise<LinkRow[]> => {
      if (!patient) return [];
      const { data, error: qErr } = await supabase
        .from("patient_hospital_links")
        .select("id, status, permission_level, requested_at, responded_at, access_valid_until, hospitals ( name )")
        .eq("patient_id", patient.id)
        .order("requested_at", { ascending: false });
      if (qErr) throw qErr;
      return (data ?? []) as LinkRow[];
    },
  });

  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ["patient_hospital_link_events", patientId],
    enabled: Boolean(patientId),
    queryFn: async (): Promise<EventRow[]> => {
      if (!patient) return [];
      const { data, error: qErr } = await supabase
        .from("patient_hospital_link_events")
        .select("id, event_type, prior_status, new_status, created_at, access_valid_until, hospitals ( name )")
        .eq("patient_id", patient.id)
        .order("created_at", { ascending: false })
        .limit(80);
      if (qErr) throw qErr;
      return (data ?? []) as EventRow[];
    },
  });

  useEffect(() => {
    if (!patientId) return;
    const channel = supabase
      .channel(`authz-phl-${patientId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "patient_hospital_links", filter: `patient_id=eq.${patientId}` },
        () => {
          void qc.invalidateQueries({ queryKey: ["patient_hospital_links", patientId] });
          void qc.invalidateQueries({ queryKey: ["patient_hospital_link_events", patientId] });
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "patient_hospital_link_events", filter: `patient_id=eq.${patientId}` },
        () => {
          void qc.invalidateQueries({ queryKey: ["patient_hospital_link_events", patientId] });
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [patientId, qc]);

  const invalidateAuthz = useCallback(async () => {
    await qc.invalidateQueries({ queryKey: ["patient_hospital_links", patientId] });
    await qc.invalidateQueries({ queryKey: ["patient_hospital_link_events", patientId] });
    void refetch();
  }, [patientId, qc, refetch]);

  const respond = useCallback(
    async (id: string, status: "approved" | "rejected") => {
      const { error: uErr } = await supabase
        .from("patient_hospital_links")
        .update({ status, responded_at: new Date().toISOString() })
        .eq("id", id);
      if (uErr) {
        Alert.alert("Erro", uErr.message);
        return;
      }
      await invalidateAuthz();
    },
    [invalidateAuthz]
  );

  const revoke = useCallback(
    async (id: string) => {
      Alert.alert("Revogar acesso", "O hospital deixa de ver os seus dados nesta instituição.", [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Revogar",
          style: "destructive",
          onPress: async () => {
            const { error: uErr } = await supabase
              .from("patient_hospital_links")
              .update({ status: "revoked", responded_at: new Date().toISOString() })
              .eq("id", id);
            if (uErr) {
              Alert.alert("Erro", uErr.message);
              return;
            }
            await invalidateAuthz();
          },
        },
      ]);
    },
    [invalidateAuthz]
  );

  const hospitalName = (h: LinkRow["hospitals"]) => {
    if (!h) return "Hospital";
    const x = Array.isArray(h) ? h[0] : h;
    return x?.name ?? "Hospital";
  };

  const eventHospitalName = (h: EventRow["hospitals"]) => {
    if (!h) return "Hospital";
    const x = Array.isArray(h) ? h[0] : h;
    return x?.name ?? "Hospital";
  };

  const permLabel = (p: string) => (p === "read_write" ? "Leitura e edição" : "Só leitura");

  const sortedEvents = useMemo(() => events ?? [], [events]);

  return (
    <ResponsiveScreen>
      <ScrollView contentContainerStyle={{ paddingVertical: theme.spacing.lg, paddingBottom: theme.spacing.xl }}>
        <Text style={[theme.typography.title1, { color: theme.colors.text.primary }]}>Hospitais e acessos</Text>
        <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: theme.spacing.sm }]}>
          Aprove ou recuse pedidos. Pode revogar um acesso aprovado a qualquer momento. Se o hospital pedir de novo após recusa ou revogação, aparecerá um novo pedido aqui.
        </Text>

        {!patient ? (
          <Text style={{ marginTop: theme.spacing.lg, color: theme.colors.text.secondary }}>Complete o cadastro do prontuário primeiro.</Text>
        ) : isLoading ? (
          <ActivityIndicator style={{ marginTop: theme.spacing.lg }} />
        ) : error ? (
          <Text style={{ marginTop: theme.spacing.lg, color: theme.colors.semantic.vitals }}>{(error as Error).message}</Text>
        ) : !links?.length ? (
          <Text style={{ marginTop: theme.spacing.lg, color: theme.colors.text.secondary }}>Nenhum pedido ou vínculo ainda.</Text>
        ) : (
          <View style={{ marginTop: theme.spacing.lg, gap: theme.spacing.md }}>
            {links.map((row) => (
              <View
                key={row.id}
                style={{
                  padding: theme.spacing.md,
                  borderRadius: theme.radius.md,
                  backgroundColor: theme.colors.background.secondary,
                }}
              >
                <Text style={[theme.typography.headline, { color: theme.colors.text.primary }]}>{hospitalName(row.hospitals)}</Text>
                <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: 4 }]}>
                  Pedido: {new Date(row.requested_at).toLocaleString("pt-BR")} · {permLabel(row.permission_level)}
                </Text>
                {row.responded_at ? (
                  <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: 4 }]}>
                    Resposta: {new Date(row.responded_at).toLocaleString("pt-BR")}
                  </Text>
                ) : null}
                {row.access_valid_until ? (
                  <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: 4 }]}>
                    Validade indicada no pedido: {new Date(row.access_valid_until).toLocaleDateString("pt-BR")}
                  </Text>
                ) : null}
                <Text style={[theme.typography.body, { marginTop: 4, color: theme.colors.text.secondary }]}>
                  Estado:{" "}
                  {row.status === "pending"
                    ? "Pendente"
                    : row.status === "approved"
                      ? "Aprovado"
                      : row.status === "rejected"
                        ? "Recusado"
                        : row.status === "revoked"
                          ? "Revogado"
                          : row.status}
                </Text>
                {row.status === "pending" ? (
                  <View style={{ flexDirection: "row", gap: theme.spacing.sm, marginTop: theme.spacing.md }}>
                    <Pressable
                      onPress={() => void respond(row.id, "approved")}
                      style={{
                        flex: 1,
                        padding: theme.spacing.sm,
                        borderRadius: theme.radius.md,
                        backgroundColor: theme.colors.semantic.nutrition,
                        alignItems: "center",
                      }}
                    >
                      <Text style={{ color: "#fff", fontWeight: "600" }}>Aceitar</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => void respond(row.id, "rejected")}
                      style={{
                        flex: 1,
                        padding: theme.spacing.sm,
                        borderRadius: theme.radius.md,
                        backgroundColor: theme.colors.background.tertiary,
                        alignItems: "center",
                      }}
                    >
                      <Text style={{ color: theme.colors.text.primary, fontWeight: "600" }}>Recusar</Text>
                    </Pressable>
                  </View>
                ) : null}
                {row.status === "approved" ? (
                  <Pressable
                    onPress={() => void revoke(row.id)}
                    style={{ marginTop: theme.spacing.md, padding: theme.spacing.sm, alignItems: "center" }}
                  >
                    <Text style={{ color: theme.colors.semantic.vitals, fontWeight: "600" }}>Revogar acesso</Text>
                  </Pressable>
                ) : null}
              </View>
            ))}
          </View>
        )}

        {patient && (links?.length ?? 0) > 0 ? (
          <View style={{ marginTop: theme.spacing.xl }}>
            <Text style={[theme.typography.headline, { color: theme.colors.text.primary }]}>Histórico de autorizações</Text>
            <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: theme.spacing.sm }]}>
              Registo de pedidos, aprovações, recusas e revogações.
            </Text>
            {eventsLoading ? (
              <ActivityIndicator style={{ marginTop: theme.spacing.md }} />
            ) : sortedEvents.length === 0 ? (
              <Text style={{ marginTop: theme.spacing.md, color: theme.colors.text.secondary }}>Sem eventos ainda.</Text>
            ) : (
              <View style={{ marginTop: theme.spacing.md, gap: theme.spacing.sm }}>
                {sortedEvents.map((ev) => (
                  <View
                    key={ev.id}
                    style={{
                      padding: theme.spacing.sm,
                      borderRadius: theme.radius.md,
                      backgroundColor: theme.colors.background.tertiary,
                    }}
                  >
                    <Text style={[theme.typography.body, { color: theme.colors.text.primary, fontWeight: "600" }]}>
                      {EVENT_LABEL[ev.event_type] ?? ev.event_type} · {eventHospitalName(ev.hospitals)}
                    </Text>
                    <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: 4, fontSize: 13 }]}>
                      {new Date(ev.created_at).toLocaleString("pt-BR")}
                      {ev.prior_status ? ` · de “${ev.prior_status}” para “${ev.new_status}”` : null}
                    </Text>
                    {ev.access_valid_until ? (
                      <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: 2, fontSize: 12 }]}>
                        Validade: {new Date(ev.access_valid_until).toLocaleDateString("pt-BR")}
                      </Text>
                    ) : null}
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : null}
      </ScrollView>
    </ResponsiveScreen>
  );
}
