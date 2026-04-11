import { useCallback } from "react";
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
  hospitals: { name: string } | { name: string }[] | null;
};

export default function AuthorizationsScreen() {
  const { theme } = useAppTheme();
  const { patient } = usePatient();
  const qc = useQueryClient();

  const { data: links, isLoading, error, refetch } = useQuery({
    queryKey: ["patient_hospital_links", patient?.id],
    enabled: Boolean(patient?.id),
    queryFn: async (): Promise<LinkRow[]> => {
      if (!patient) return [];
      const { data, error: qErr } = await supabase
        .from("patient_hospital_links")
        .select("id, status, permission_level, requested_at, hospitals ( name )")
        .eq("patient_id", patient.id)
        .order("requested_at", { ascending: false });
      if (qErr) throw qErr;
      return (data ?? []) as LinkRow[];
    },
  });

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
      await qc.invalidateQueries({ queryKey: ["patient_hospital_links", patient?.id] });
      void refetch();
    },
    [patient?.id, qc, refetch]
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
            await qc.invalidateQueries({ queryKey: ["patient_hospital_links", patient?.id] });
            void refetch();
          },
        },
      ]);
    },
    [patient?.id, qc, refetch]
  );

  const hospitalName = (h: LinkRow["hospitals"]) => {
    if (!h) return "Hospital";
    const x = Array.isArray(h) ? h[0] : h;
    return x?.name ?? "Hospital";
  };

  const permLabel = (p: string) => (p === "read_write" ? "Leitura e edição" : "Só leitura");

  return (
    <ResponsiveScreen>
      <ScrollView contentContainerStyle={{ paddingVertical: theme.spacing.lg, paddingBottom: theme.spacing.xl }}>
        <Text style={[theme.typography.title1, { color: theme.colors.text.primary }]}>Hospitais e acessos</Text>
        <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: theme.spacing.sm }]}>
          Aprove ou recuse pedidos. Pode revogar um acesso aprovado a qualquer momento.
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
      </ScrollView>
    </ResponsiveScreen>
  );
}
