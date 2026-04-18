import { useCallback, useEffect, useMemo, useRef, useState, type ElementRef } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Share,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { Image } from "expo-image";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import * as ImagePicker from "expo-image-picker";
import * as WebBrowser from "expo-web-browser";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CANCER_TYPES, type CancerTypeId } from "@/src/constants/clinical";
import { useAuth } from "@/src/auth/AuthContext";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import {
  emergencyContactsQueryKey,
  useEmergencyContacts,
} from "@/src/hooks/useEmergencyContacts";
import { usePatientConsentNotifications } from "@/src/hooks/usePatientConsentNotifications";
import { useInvalidatePatient, usePatient } from "@/src/hooks/usePatient";
import { labelCancerType } from "@/src/i18n/ui";
import { supabase } from "@/src/lib/supabase";
import { alertPermissionToSettings } from "@/src/lib/nativePickerTiming";

type TabKey = "dados" | "ficha" | "notificacoes" | "configuracoes";

type Props = {
  visible: boolean;
  onClose: () => void;
  profileName: string;
  localAvatarUri: string | null;
  remoteAvatarUrl: string | null;
  onSignOut: () => void;
  onProfileSaved?: () => void | Promise<void>;
};

const TERMS_URL = "https://lore-kd37.vercel.app/termos";
const PRIVACY_URL = "https://lore-kd37.vercel.app/privacidade";

function cacheBustHttp(uri: string, epoch: number): string {
  if (!uri.startsWith("http")) return uri;
  const sep = uri.includes("?") ? "&" : "?";
  return `${uri}${sep}v=${epoch}`;
}

/** Rótulos curtos na barra horizontal para o ícone não ser cortado; o conteúdo de cada separador mantém o título completo. */
const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: "dados", label: "Dados", icon: "heartbeat" },
  { key: "ficha", label: "Ficha", icon: "id-card-o" },
  { key: "notificacoes", label: "Alertas", icon: "bell" },
  { key: "configuracoes", label: "Ajustes", icon: "cog" },
];

type PregnancyUi = "unset" | "no" | "yes";

function pregnancyToDb(p: PregnancyUi): boolean | null {
  if (p === "unset") return null;
  return p === "yes";
}

function pregnancyFromDb(v: boolean | null | undefined): PregnancyUi {
  if (v === null || v === undefined) return "unset";
  return v ? "yes" : "no";
}

function parseOptNum(s: string): number | null {
  const t = s.trim().replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

type ContactDraft = { id?: string; full_name: string; phone: string; relationship: string };

export function ProfileSheet({
  visible,
  onClose,
  profileName,
  localAvatarUri,
  remoteAvatarUrl,
  onSignOut,
  onProfileSaved,
}: Props) {
  const router = useRouter();
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const profileSheetModalRef = useRef<ElementRef<typeof BottomSheetModal>>(null);
  /** Um único snap — altura fixa em % do ecrã (sem `enableDynamicSizing`). */
  const snapPoints = useMemo(() => ["92%"], []);
  const { session, deleteAccount } = useAuth();
  const [deleteAccountBusy, setDeleteAccountBusy] = useState(false);
  const uid = session?.user?.id;
  const qc = useQueryClient();
  const { patient, loading: patientLoading, refresh } = usePatient();
  const invalidatePatient = useInvalidatePatient();
  const {
    data: notifPrefs,
    isLoading: notifLoading,
    updatePrefs,
  } = usePatientConsentNotifications();
  const { data: emergencyRows } = useEmergencyContacts(patient?.id ?? null);

  const [tab, setTab] = useState<TabKey>("dados");
  const [cancer, setCancer] = useState<CancerTypeId>("other");
  const [stage, setStage] = useState("");
  const [pregnancy, setPregnancy] = useState<PregnancyUi>("unset");
  const [usesContinuousMedication, setUsesContinuousMedication] = useState(false);
  const [continuousMedNotes, setContinuousMedNotes] = useState("");
  const [medicalHistory, setMedicalHistory] = useState("");
  const [allergies, setAllergies] = useState("");
  const [heightStr, setHeightStr] = useState("");
  const [weightStr, setWeightStr] = useState("");
  const [clinicalNotes, setClinicalNotes] = useState("");
  const [nameDraft, setNameDraft] = useState("");
  const [contactsDraft, setContactsDraft] = useState<ContactDraft[]>([]);
  const [fichaBusy, setFichaBusy] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarEpoch, setAvatarEpoch] = useState(0);
  const [caregiverCodeBusy, setCaregiverCodeBusy] = useState(false);
  const [caregiverPairCode, setCaregiverPairCode] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    void refresh();
  }, [visible, refresh]);

  useEffect(() => {
    if (!patient) return;
    const c = patient.primary_cancer_type as CancerTypeId;
    setCancer(CANCER_TYPES.includes(c) ? c : "other");
    setStage(patient.current_stage ?? "");
    setPregnancy(pregnancyFromDb(patient.is_pregnant));
    setUsesContinuousMedication(patient.uses_continuous_medication);
    setContinuousMedNotes(patient.continuous_medication_notes ?? "");
    setMedicalHistory(patient.medical_history ?? "");
    setAllergies(patient.allergies ?? "");
    setHeightStr(patient.height_cm != null ? String(patient.height_cm) : "");
    setWeightStr(patient.weight_kg != null ? String(patient.weight_kg) : "");
    setClinicalNotes(patient.clinical_notes ?? "");
  }, [
    patient?.id,
    patient?.primary_cancer_type,
    patient?.current_stage,
    patient?.is_pregnant,
    patient?.uses_continuous_medication,
    patient?.continuous_medication_notes,
    patient?.medical_history,
    patient?.allergies,
    patient?.height_cm,
    patient?.weight_kg,
    patient?.clinical_notes,
  ]);

  useEffect(() => {
    setNameDraft(profileName);
  }, [profileName, visible]);

  useEffect(() => {
    if (!emergencyRows) return;
    setContactsDraft(
      emergencyRows.map((r) => ({
        id: r.id,
        full_name: r.full_name,
        phone: r.phone,
        relationship: r.relationship ?? "",
      }))
    );
  }, [emergencyRows]);

  const firstName = useMemo(() => {
    const t = (nameDraft || profileName).trim();
    if (!t) return "Você";
    return t.split(/\s+/)[0] ?? t;
  }, [nameDraft, profileName]);

  const initials = useMemo(() => {
    const t = (nameDraft || profileName).trim();
    if (!t) return "?";
    const parts = t.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
    return `${parts[0].slice(0, 1)}${parts[parts.length - 1].slice(0, 1)}`.toUpperCase();
  }, [nameDraft, profileName]);

  const remoteFromProfile = remoteAvatarUrl ?? patient?.profiles?.avatar_url ?? null;
  const displayAvatarUri = remoteFromProfile ?? localAvatarUri;

  const cardBg = theme.colors.background.secondary;
  const radius = theme.radius.md;

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} pressBehavior="close" />
    ),
    []
  );

  useEffect(() => {
    if (visible) {
      profileSheetModalRef.current?.present();
    } else {
      profileSheetModalRef.current?.dismiss();
    }
  }, [visible]);

  async function syncEmergencyContacts(patientId: string, draft: ContactDraft[]) {
    const { data: existing } = await supabase.from("patient_emergency_contacts").select("id").eq("patient_id", patientId);
    const existingIds = new Set((existing ?? []).map((r) => (r as { id: string }).id));
    const keepIds = new Set(draft.filter((d) => d.id).map((d) => d.id as string));
    for (const id of existingIds) {
      if (!keepIds.has(id)) {
        await supabase.from("patient_emergency_contacts").delete().eq("id", id);
      }
    }
    let sort = 0;
    for (const row of draft) {
      const trimmedName = row.full_name.trim();
      const trimmedPhone = row.phone.trim();
      if (!trimmedName && !trimmedPhone) continue;
      const payload = {
        patient_id: patientId,
        full_name: trimmedName || "—",
        phone: trimmedPhone || "—",
        relationship: row.relationship.trim() || null,
        sort_order: sort++,
      };
      if (row.id) {
        const { error } = await supabase.from("patient_emergency_contacts").update(payload).eq("id", row.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("patient_emergency_contacts").insert(payload);
        if (error) throw error;
      }
    }
  }

  async function saveFicha() {
    if (!patient || !uid) return;
    setFichaBusy(true);
    try {
      const heightCm = parseOptNum(heightStr);
      const weightKg = parseOptNum(weightStr);
      const { error: pErr } = await supabase
        .from("patients")
        .update({
          primary_cancer_type: cancer,
          current_stage: stage.trim() || null,
          is_pregnant: pregnancyToDb(pregnancy),
          uses_continuous_medication: usesContinuousMedication,
          continuous_medication_notes: continuousMedNotes.trim() || null,
          medical_history: medicalHistory.trim() || null,
          allergies: allergies.trim() || null,
          height_cm: heightCm,
          weight_kg: weightKg,
          clinical_notes: clinicalNotes.trim() || null,
        })
        .eq("id", patient.id);
      if (pErr) throw pErr;

      const trimmedName = nameDraft.trim();
      if (trimmedName) {
        const { error: nErr } = await supabase.from("profiles").update({ full_name: trimmedName }).eq("id", uid);
        if (nErr) throw nErr;
      }

      await syncEmergencyContacts(patient.id, contactsDraft);

      invalidatePatient();
      await qc.invalidateQueries({ queryKey: emergencyContactsQueryKey(patient.id) });
      await refresh();
      await Promise.resolve(onProfileSaved?.());
      Alert.alert("Guardado", "A ficha médica foi atualizada.");
    } catch (e) {
      Alert.alert("Não foi possível guardar", e instanceof Error ? e.message : "Erro desconhecido");
    } finally {
      setFichaBusy(false);
    }
  }

  async function pickAndUploadAvatar() {
    if (!uid) return;
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      const limited =
        Platform.OS === "ios" &&
        "accessPrivileges" in perm &&
        (perm as { accessPrivileges?: string }).accessPrivileges === "limited";
      if (!perm.granted && !limited) {
        if (perm.canAskAgain === false) {
          alertPermissionToSettings(
            "Acesso à galeria",
            "Ative o acesso a Fotos nas definições do sistema para escolher uma imagem."
          );
        } else {
          Alert.alert("Permissão", "É necessário permitir o acesso à galeria para alterar a foto.");
        }
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 0.85,
      });
      if (result.canceled || !result.assets?.[0]?.uri) return;
      const uri = result.assets[0].uri;
      setAvatarBusy(true);
      const res = await fetch(uri);
      const buf = await res.arrayBuffer();
      const lower = uri.toLowerCase();
      const contentType = lower.includes("png")
        ? "image/png"
        : lower.includes("webp")
          ? "image/webp"
          : "image/jpeg";
      const path = `${uid}/avatar.jpg`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, buf, {
        contentType,
        upsert: true,
      });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrl = pub.publicUrl;
      const { error: prErr } = await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", uid);
      if (prErr) throw prErr;
      invalidatePatient();
      if (uid) await qc.refetchQueries({ queryKey: ["patient", uid] });
      await refresh();
      setAvatarEpoch((n) => n + 1);
      await Promise.resolve(onProfileSaved?.());
    } catch (e) {
      console.warn("[avatar upload]", e);
      Alert.alert("Foto de perfil", e instanceof Error ? e.message : "Não foi possível enviar a imagem.");
    } finally {
      setAvatarBusy(false);
    }
  }

  return (
    <BottomSheetModal
      ref={profileSheetModalRef}
      snapPoints={snapPoints}
      enablePanDownToClose
      enableOverDrag={false}
      onDismiss={onClose}
      backdropComponent={renderBackdrop}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      topInset={insets.top}
      bottomInset={Math.max(insets.bottom, theme.spacing.md)}
      backgroundStyle={{
        backgroundColor: theme.colors.background.primary,
        borderTopLeftRadius: theme.radius.xl,
        borderTopRightRadius: theme.radius.xl,
      }}
      handleIndicatorStyle={{
        width: 40,
        height: 4,
        backgroundColor: theme.colors.border.divider,
      }}
    >
      <BottomSheetScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        style={{ flex: 1 }}
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: Math.max(insets.bottom, theme.spacing.md) + theme.spacing.lg,
        }}
      >
        <View style={{ alignItems: "center", paddingTop: theme.spacing.md, paddingHorizontal: theme.spacing.md }}>
            <Pressable
              onPress={() => void pickAndUploadAvatar()}
              disabled={avatarBusy}
              accessibilityRole="button"
              accessibilityLabel="Alterar foto de perfil"
            >
              {displayAvatarUri ? (
                <Image
                  key={`${displayAvatarUri}-${avatarEpoch}`}
                  source={{ uri: cacheBustHttp(displayAvatarUri, avatarEpoch) }}
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 40,
                    backgroundColor: theme.colors.background.secondary,
                  }}
                  contentFit="cover"
                  cachePolicy="none"
                />
              ) : (
                <View
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 40,
                    backgroundColor: theme.colors.semantic.treatment,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ fontSize: 28, fontWeight: "700", color: "#FFFFFF" }}>{initials}</Text>
                </View>
              )}
            </Pressable>
            {avatarBusy ? (
              <ActivityIndicator style={{ marginTop: theme.spacing.sm }} color={theme.colors.semantic.treatment} />
            ) : (
              <Text style={{ fontSize: 13, color: theme.colors.text.secondary, marginTop: theme.spacing.sm }}>
                Toque na foto para alterar
              </Text>
            )}
            <TextInput
              value={nameDraft}
              onChangeText={setNameDraft}
              placeholder="Nome completo"
              placeholderTextColor={theme.colors.text.tertiary}
              style={{
                marginTop: theme.spacing.md,
                width: "100%",
                textAlign: "center",
                fontSize: 22,
                fontWeight: "700",
                color: theme.colors.text.primary,
                borderBottomWidth: 1,
                borderBottomColor: theme.colors.border.divider,
                paddingVertical: theme.spacing.sm,
              }}
            />
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: theme.spacing.md,
              paddingVertical: theme.spacing.md,
              gap: 10,
              alignItems: "flex-start",
            }}
            style={{ flexGrow: 0 }}
          >
            {TABS.map((t) => {
              const active = tab === t.key;
              return (
                <Pressable
                  key={t.key}
                  onPress={() => setTab(t.key)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  style={{
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    paddingVertical: 10,
                    paddingHorizontal: 12,
                    minWidth: 76,
                    maxWidth: 100,
                    borderRadius: radius,
                    backgroundColor: active ? theme.colors.semantic.treatment : cardBg,
                    flexShrink: 0,
                  }}
                >
                  <FontAwesome name={t.icon as never} size={20} color={active ? "#FFFFFF" : theme.colors.text.secondary} />
                  <Text
                    numberOfLines={2}
                    style={{
                      marginTop: 6,
                      fontSize: 11,
                      lineHeight: 14,
                      fontWeight: active ? "700" : "600",
                      color: active ? "#FFFFFF" : theme.colors.text.primary,
                      textAlign: "center",
                    }}
                  >
                    {t.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={{ paddingHorizontal: theme.spacing.md }}>

            {tab === "dados" && (
              <View style={{ gap: theme.spacing.md }}>
                <Text style={[theme.typography.body, { color: theme.colors.text.secondary }]}>
                  Identificação Aura e ligações com hospitais. A condição clínica detalhada está em «Ficha médica».
                </Text>

                <View style={{ backgroundColor: cardBg, borderRadius: radius, overflow: "hidden" }}>
                  <SectionTitle theme={theme} color={theme.colors.semantic.treatment}>
                    ID Aura
                  </SectionTitle>
                  {patientLoading ? (
                    <View style={{ padding: theme.spacing.lg, alignItems: "center" }}>
                      <ActivityIndicator color={theme.colors.semantic.treatment} />
                    </View>
                  ) : !patient ? (
                    <Text style={{ paddingHorizontal: theme.spacing.md, paddingBottom: theme.spacing.md, color: theme.colors.text.secondary }}>
                      Complete o cadastro do prontuário para receber o código.
                    </Text>
                  ) : (
                    <>
                      <View style={{ paddingHorizontal: theme.spacing.md, paddingBottom: theme.spacing.sm }}>
                        {patient.patient_code ? (
                          <Text
                            selectable
                            style={{
                              fontSize: 22,
                              fontWeight: "700",
                              letterSpacing: 1,
                              color: theme.colors.text.primary,
                              fontVariant: ["tabular-nums"],
                            }}
                          >
                            {patient.patient_code}
                          </Text>
                        ) : (
                          <View>
                            <Text style={[theme.typography.headline, { color: theme.colors.text.primary }]}>—</Text>
                            <Text style={{ fontSize: 13, color: theme.colors.text.secondary, marginTop: 6 }}>
                              Código indisponível neste servidor (confirme migration `patient_code`).
                            </Text>
                          </View>
                        )}
                      </View>
                      {patient.patient_code ? (
                        <Pressable
                          onPress={() => void Share.share({ message: patient.patient_code ?? "" })}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 8,
                            paddingVertical: theme.spacing.md,
                            borderTopWidth: 1,
                            borderTopColor: theme.colors.border.divider,
                          }}
                        >
                          <FontAwesome name="share-alt" size={16} color={theme.colors.semantic.treatment} />
                          <Text style={{ fontWeight: "600", color: theme.colors.semantic.treatment }}>Compartilhar código</Text>
                        </Pressable>
                      ) : null}
                    </>
                  )}
                </View>

                <View style={{ backgroundColor: cardBg, borderRadius: radius, overflow: "hidden" }}>
                  <SectionTitle theme={theme} color={theme.colors.semantic.treatment}>
                    Hospitais
                  </SectionTitle>
                  <Pressable
                    onPress={() => {
                      onClose();
                      router.push("/authorizations");
                    }}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      paddingHorizontal: theme.spacing.md,
                      paddingVertical: theme.spacing.md,
                    }}
                  >
                    <Text style={[theme.typography.body, { color: theme.colors.text.primary, flex: 1 }]}>Pedidos e autorizações</Text>
                    <FontAwesome name="angle-right" size={20} color={theme.colors.text.tertiary} />
                  </Pressable>
                </View>

                <View style={{ backgroundColor: cardBg, borderRadius: radius, overflow: "hidden" }}>
                  <SectionTitle theme={theme} color={theme.colors.semantic.treatment}>
                    Cuidador
                  </SectionTitle>
                  <Text
                    style={{
                      paddingHorizontal: theme.spacing.md,
                      paddingBottom: theme.spacing.sm,
                      color: theme.colors.text.secondary,
                      fontSize: 13,
                    }}
                  >
                    Gere um código de 6 caracteres para um familiar o introduzir na conta dele (Ajustes → Emparelhar como cuidador).
                  </Text>
                  {caregiverPairCode ? (
                    <Text
                      selectable
                      style={{
                        paddingHorizontal: theme.spacing.md,
                        paddingBottom: theme.spacing.sm,
                        fontSize: 22,
                        fontWeight: "700",
                        letterSpacing: 2,
                        color: theme.colors.text.primary,
                      }}
                    >
                      {caregiverPairCode}
                    </Text>
                  ) : null}
                  <Pressable
                    disabled={caregiverCodeBusy || !patient}
                    onPress={() => {
                      void (async () => {
                        setCaregiverCodeBusy(true);
                        const { data, error } = await supabase.rpc("regenerate_caregiver_pairing_code");
                        setCaregiverCodeBusy(false);
                        if (error) {
                          Alert.alert("Código", error.message);
                          return;
                        }
                        if (data != null) setCaregiverPairCode(String(data));
                      })();
                    }}
                    style={{
                      paddingVertical: theme.spacing.md,
                      paddingHorizontal: theme.spacing.md,
                      borderTopWidth: 1,
                      borderTopColor: theme.colors.border.divider,
                      opacity: caregiverCodeBusy || !patient ? 0.55 : 1,
                    }}
                  >
                    <Text style={{ fontWeight: "700", color: theme.colors.semantic.treatment }}>
                      {caregiverCodeBusy ? "A gerar…" : "Gerar novo código"}
                    </Text>
                  </Pressable>
                </View>

                <Pressable
                  onPress={onClose}
                  style={{
                    padding: theme.spacing.md,
                    borderRadius: radius,
                    backgroundColor: theme.colors.background.tertiary,
                    alignItems: "center",
                  }}
                >
                  <Text style={[theme.typography.headline, { color: theme.colors.semantic.treatment }]}>Ir ao Resumo</Text>
                </Pressable>
              </View>
            )}

            {tab === "ficha" && (
              <View style={{ gap: theme.spacing.md }}>
                <Text style={[theme.typography.body, { color: theme.colors.text.secondary }]}>
                  Ficha médica — informações clínicas protegidas (LGPD). Guarde as alterações antes de sair.
                </Text>
                {!patient ? (
                  <Text style={{ color: theme.colors.text.secondary }}>Complete o onboarding para editar a ficha.</Text>
                ) : (
                  <>
                    <View style={{ backgroundColor: cardBg, borderRadius: radius, padding: theme.spacing.md }}>
                      <Text style={{ fontSize: 12, color: theme.colors.text.secondary, marginBottom: theme.spacing.sm }}>Tipo de câncer (resumo)</Text>
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm }}>
                        {CANCER_TYPES.map((c) => (
                          <Pressable
                            key={c}
                            onPress={() => setCancer(c)}
                            style={{
                              paddingHorizontal: theme.spacing.md,
                              paddingVertical: theme.spacing.sm,
                              borderRadius: theme.radius.md,
                              backgroundColor: cancer === c ? theme.colors.semantic.treatment : theme.colors.background.tertiary,
                            }}
                          >
                            <Text style={{ color: cancer === c ? "#FFFFFF" : theme.colors.text.primary, fontSize: 14 }}>
                              {labelCancerType(c)}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>
                    <View style={{ backgroundColor: cardBg, borderRadius: radius, padding: theme.spacing.md }}>
                      <Text style={{ fontSize: 12, color: theme.colors.text.secondary, marginBottom: 6 }}>Estágio (opcional)</Text>
                      <TextInput
                        value={stage}
                        onChangeText={setStage}
                        placeholder="Ex.: estádio III"
                        placeholderTextColor={theme.colors.text.tertiary}
                        style={{
                          borderRadius: theme.radius.md,
                          padding: theme.spacing.md,
                          backgroundColor: theme.colors.background.tertiary,
                          color: theme.colors.text.primary,
                          fontSize: 17,
                        }}
                      />
                    </View>

                    <View style={{ backgroundColor: cardBg, borderRadius: radius, padding: theme.spacing.md }}>
                      <Text style={{ fontSize: 12, color: theme.colors.text.secondary, marginBottom: theme.spacing.sm }}>Gravidez</Text>
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm }}>
                        {(
                          [
                            { k: "unset" as const, label: "Não informar" },
                            { k: "no" as const, label: "Não" },
                            { k: "yes" as const, label: "Sim" },
                          ] as const
                        ).map(({ k, label }) => (
                          <Pressable
                            key={k}
                            onPress={() => setPregnancy(k)}
                            style={{
                              paddingHorizontal: theme.spacing.md,
                              paddingVertical: theme.spacing.sm,
                              borderRadius: theme.radius.md,
                              backgroundColor: pregnancy === k ? theme.colors.semantic.treatment : theme.colors.background.tertiary,
                            }}
                          >
                            <Text style={{ color: pregnancy === k ? "#FFFFFF" : theme.colors.text.primary, fontSize: 14 }}>{label}</Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>

                    <View
                      style={{
                        backgroundColor: cardBg,
                        borderRadius: radius,
                        padding: theme.spacing.md,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <View style={{ flex: 1, paddingRight: theme.spacing.md }}>
                        <Text style={[theme.typography.headline, { color: theme.colors.text.primary }]}>Uso contínuo de medicamentos</Text>
                        <Text style={{ fontSize: 13, color: theme.colors.text.secondary, marginTop: 4 }}>Ex.: terapia crónica diária</Text>
                      </View>
                      <Switch value={usesContinuousMedication} onValueChange={setUsesContinuousMedication} />
                    </View>
                    <View style={{ backgroundColor: cardBg, borderRadius: radius, padding: theme.spacing.md }}>
                      <Text style={{ fontSize: 12, color: theme.colors.text.secondary, marginBottom: 6 }}>Quais medicamentos (opcional)</Text>
                      <TextInput
                        value={continuousMedNotes}
                        onChangeText={setContinuousMedNotes}
                        placeholder="Ex.: levotiroxina 75 µg"
                        placeholderTextColor={theme.colors.text.tertiary}
                        multiline
                        style={{
                          borderRadius: theme.radius.md,
                          padding: theme.spacing.md,
                          backgroundColor: theme.colors.background.tertiary,
                          color: theme.colors.text.primary,
                          fontSize: 16,
                          minHeight: 72,
                          textAlignVertical: "top",
                        }}
                      />
                    </View>

                    <View style={{ backgroundColor: cardBg, borderRadius: radius, padding: theme.spacing.md }}>
                      <Text style={{ fontSize: 12, color: theme.colors.text.secondary, marginBottom: 6 }}>Doenças e condições anteriores</Text>
                      <TextInput
                        value={medicalHistory}
                        onChangeText={setMedicalHistory}
                        placeholder="Histórico relevante…"
                        placeholderTextColor={theme.colors.text.tertiary}
                        multiline
                        style={{
                          borderRadius: theme.radius.md,
                          padding: theme.spacing.md,
                          backgroundColor: theme.colors.background.tertiary,
                          color: theme.colors.text.primary,
                          fontSize: 16,
                          minHeight: 88,
                          textAlignVertical: "top",
                        }}
                      />
                    </View>
                    <View style={{ backgroundColor: cardBg, borderRadius: radius, padding: theme.spacing.md }}>
                      <Text style={{ fontSize: 12, color: theme.colors.text.secondary, marginBottom: 6 }}>Alergias</Text>
                      <TextInput
                        value={allergies}
                        onChangeText={setAllergies}
                        placeholder="Medicamentos, alimentos, outros…"
                        placeholderTextColor={theme.colors.text.tertiary}
                        multiline
                        style={{
                          borderRadius: theme.radius.md,
                          padding: theme.spacing.md,
                          backgroundColor: theme.colors.background.tertiary,
                          color: theme.colors.text.primary,
                          fontSize: 16,
                          minHeight: 72,
                          textAlignVertical: "top",
                        }}
                      />
                    </View>

                    <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
                      <View style={{ flex: 1, backgroundColor: cardBg, borderRadius: radius, padding: theme.spacing.md }}>
                        <Text style={{ fontSize: 12, color: theme.colors.text.secondary, marginBottom: 6 }}>Altura (cm)</Text>
                        <TextInput
                          value={heightStr}
                          onChangeText={setHeightStr}
                          keyboardType="decimal-pad"
                          placeholder="—"
                          placeholderTextColor={theme.colors.text.tertiary}
                          style={{
                            borderRadius: theme.radius.md,
                            padding: theme.spacing.md,
                            backgroundColor: theme.colors.background.tertiary,
                            color: theme.colors.text.primary,
                            fontSize: 17,
                          }}
                        />
                      </View>
                      <View style={{ flex: 1, backgroundColor: cardBg, borderRadius: radius, padding: theme.spacing.md }}>
                        <Text style={{ fontSize: 12, color: theme.colors.text.secondary, marginBottom: 6 }}>Peso (kg)</Text>
                        <TextInput
                          value={weightStr}
                          onChangeText={setWeightStr}
                          keyboardType="decimal-pad"
                          placeholder="—"
                          placeholderTextColor={theme.colors.text.tertiary}
                          style={{
                            borderRadius: theme.radius.md,
                            padding: theme.spacing.md,
                            backgroundColor: theme.colors.background.tertiary,
                            color: theme.colors.text.primary,
                            fontSize: 17,
                          }}
                        />
                      </View>
                    </View>

                    <View style={{ backgroundColor: cardBg, borderRadius: radius, padding: theme.spacing.md }}>
                      <Text style={{ fontSize: 12, color: theme.colors.text.secondary, marginBottom: 6 }}>Notas</Text>
                      <TextInput
                        value={clinicalNotes}
                        onChangeText={setClinicalNotes}
                        placeholder="Observações para a equipe ou para si…"
                        placeholderTextColor={theme.colors.text.tertiary}
                        multiline
                        style={{
                          borderRadius: theme.radius.md,
                          padding: theme.spacing.md,
                          backgroundColor: theme.colors.background.tertiary,
                          color: theme.colors.text.primary,
                          fontSize: 16,
                          minHeight: 96,
                          textAlignVertical: "top",
                        }}
                      />
                    </View>

                    <View style={{ backgroundColor: cardBg, borderRadius: radius, overflow: "hidden" }}>
                      <SectionTitle theme={theme} color={theme.colors.semantic.treatment}>
                        Contactos de emergência
                      </SectionTitle>
                      {contactsDraft.map((row, idx) => (
                        <View
                          key={row.id ?? `new-${idx}`}
                          style={{
                            paddingHorizontal: theme.spacing.md,
                            paddingBottom: theme.spacing.md,
                            borderBottomWidth: idx < contactsDraft.length - 1 ? 1 : 0,
                            borderBottomColor: theme.colors.border.divider,
                          }}
                        >
                          <TextInput
                            value={row.full_name}
                            onChangeText={(t) => {
                              const next = [...contactsDraft];
                              next[idx] = { ...next[idx], full_name: t };
                              setContactsDraft(next);
                            }}
                            placeholder="Nome"
                            placeholderTextColor={theme.colors.text.tertiary}
                            style={{
                              marginTop: theme.spacing.sm,
                              borderRadius: theme.radius.md,
                              padding: theme.spacing.sm,
                              backgroundColor: theme.colors.background.tertiary,
                              color: theme.colors.text.primary,
                            }}
                          />
                          <TextInput
                            value={row.phone}
                            onChangeText={(t) => {
                              const next = [...contactsDraft];
                              next[idx] = { ...next[idx], phone: t };
                              setContactsDraft(next);
                            }}
                            placeholder="Telefone"
                            placeholderTextColor={theme.colors.text.tertiary}
                            keyboardType="phone-pad"
                            style={{
                              marginTop: theme.spacing.sm,
                              borderRadius: theme.radius.md,
                              padding: theme.spacing.sm,
                              backgroundColor: theme.colors.background.tertiary,
                              color: theme.colors.text.primary,
                            }}
                          />
                          <TextInput
                            value={row.relationship}
                            onChangeText={(t) => {
                              const next = [...contactsDraft];
                              next[idx] = { ...next[idx], relationship: t };
                              setContactsDraft(next);
                            }}
                            placeholder="Parentesco (opcional)"
                            placeholderTextColor={theme.colors.text.tertiary}
                            style={{
                              marginTop: theme.spacing.sm,
                              borderRadius: theme.radius.md,
                              padding: theme.spacing.sm,
                              backgroundColor: theme.colors.background.tertiary,
                              color: theme.colors.text.primary,
                            }}
                          />
                          <Pressable
                            onPress={() => setContactsDraft(contactsDraft.filter((_, i) => i !== idx))}
                            style={{ marginTop: theme.spacing.sm, alignSelf: "flex-start" }}
                          >
                            <Text style={{ color: theme.colors.semantic.vitals, fontWeight: "600" }}>Remover contacto</Text>
                          </Pressable>
                        </View>
                      ))}
                      <Pressable
                        onPress={() => setContactsDraft([...contactsDraft, { full_name: "", phone: "", relationship: "" }])}
                        style={{
                          padding: theme.spacing.md,
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 8,
                          justifyContent: "center",
                        }}
                      >
                        <FontAwesome name="plus" size={16} color={theme.colors.semantic.treatment} />
                        <Text style={{ fontWeight: "700", color: theme.colors.semantic.treatment }}>Adicionar contacto</Text>
                      </Pressable>
                    </View>

                    <View
                      style={{
                        padding: theme.spacing.md,
                        borderRadius: radius,
                        borderLeftWidth: 3,
                        borderLeftColor: theme.colors.semantic.treatment,
                        backgroundColor: theme.colors.background.tertiary,
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: "700", color: theme.colors.text.secondary, letterSpacing: 0.3 }}>
                        INDICADOR AUTOMÁTICO — NADIR
                      </Text>
                      <Text style={{ fontSize: 13, color: theme.colors.text.secondary, marginTop: 6, lineHeight: 18 }}>
                        Não tem interruptor: é calculado no servidor com base nas datas de infusão (janela habitual 7–14 dias após a última
                        sessão). Reforça regras de alerta de febre quando aplicável.
                      </Text>
                      <Text
                        style={{
                          fontSize: 14,
                          color: theme.colors.text.primary,
                          marginTop: theme.spacing.sm,
                          fontWeight: "600",
                        }}
                      >
                        Estado: {patient.is_in_nadir ? "na janela de nadir — vigilância febril" : "fora da janela"}
                      </Text>
                    </View>

                    <Pressable
                      onPress={() => void saveFicha()}
                      disabled={fichaBusy}
                      style={{
                        padding: theme.spacing.md,
                        borderRadius: radius,
                        backgroundColor: theme.colors.semantic.nutrition,
                        alignItems: "center",
                        opacity: fichaBusy ? 0.65 : 1,
                      }}
                    >
                      <Text style={{ fontWeight: "700", fontSize: 17, color: "#FFFFFF" }}>{fichaBusy ? "A guardar…" : "Guardar ficha"}</Text>
                    </Pressable>
                  </>
                )}
              </View>
            )}

            {tab === "notificacoes" && (
              <View style={{ gap: theme.spacing.md }}>
                <Text style={[theme.typography.body, { color: theme.colors.text.secondary }]}>
                  Escolha que tipo de lembretes quer. O celular também precisa de permissão para notificações.
                </Text>
                {notifLoading ? (
                  <ActivityIndicator />
                ) : !notifPrefs ? (
                  <Text style={{ color: theme.colors.text.secondary }}>
                    Aceite o consentimento inicial (LGPD) para configurar alertas. Se já aceitou, atualize a base com a migration das colunas
                    notify_*.
                  </Text>
                ) : (
                  <>
                    <NotifRow
                      theme={theme}
                      cardBg={cardBg}
                      radius={radius}
                      title="Alertas gerais"
                      subtitle="Canal principal (consentimento de notificações)."
                      value={notifPrefs.consent_notifications}
                      onValue={(v) => void updatePrefs.mutateAsync({ consent_notifications: v })}
                      disabled={updatePrefs.isPending}
                    />
                    <NotifRow
                      theme={theme}
                      cardBg={cardBg}
                      radius={radius}
                      title="Medicamentos"
                      subtitle="Lembretes de tomas e doses."
                      value={notifPrefs.notify_medications}
                      onValue={(v) => void updatePrefs.mutateAsync({ notify_medications: v })}
                      disabled={updatePrefs.isPending}
                    />
                    <NotifRow
                      theme={theme}
                      cardBg={cardBg}
                      radius={radius}
                      title="Consultas e exames"
                      subtitle="A partir do calendário do app."
                      value={notifPrefs.notify_appointments}
                      onValue={(v) => void updatePrefs.mutateAsync({ notify_appointments: v })}
                      disabled={updatePrefs.isPending}
                    />
                    <NotifRow
                      theme={theme}
                      cardBg={cardBg}
                      radius={radius}
                      title="Sintomas e diário"
                      subtitle="Lembretes para registrar o diário."
                      value={notifPrefs.notify_symptoms}
                      onValue={(v) => void updatePrefs.mutateAsync({ notify_symptoms: v })}
                      disabled={updatePrefs.isPending}
                    />
                  </>
                )}
              </View>
            )}

            {tab === "configuracoes" && (
              <View style={{ gap: theme.spacing.sm }}>
                <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginBottom: theme.spacing.xs }]}>
                  Conta, privacidade e sessão.
                </Text>
                <View style={{ backgroundColor: cardBg, borderRadius: radius, overflow: "hidden" }}>
                  <ConfigRow
                    icon="file-text-o"
                    label="Termos de uso"
                    onPress={() => void WebBrowser.openBrowserAsync(TERMS_URL)}
                    theme={theme}
                  />
                  <View style={{ height: 1, backgroundColor: theme.colors.border.divider, marginLeft: 52 }} />
                  <ConfigRow
                    icon="lock"
                    label="Política de privacidade"
                    onPress={() => void WebBrowser.openBrowserAsync(PRIVACY_URL)}
                    theme={theme}
                  />
                  <View style={{ height: 1, backgroundColor: theme.colors.border.divider, marginLeft: 52 }} />
                  <ConfigRow
                    icon="users"
                    label="Emparelhar como cuidador"
                    onPress={() => {
                      onClose();
                      router.push("/caregiver-claim");
                    }}
                    theme={theme}
                  />
                </View>
                <Pressable
                  onPress={() => {
                    if (deleteAccountBusy) return;
                    Alert.alert(
                      "Excluir conta",
                      "Todos os seus dados na Aura Onco serão apagados de forma permanente (perfil, registos de saúde, ficheiros associados). Esta ação não pode ser desfeita.",
                      [
                        { text: "Cancelar", style: "cancel" },
                        {
                          text: "Continuar",
                          style: "destructive",
                          onPress: () => {
                            Alert.alert(
                              "Confirmação final",
                              "Tem a certeza absoluta que deseja excluir a sua conta?",
                              [
                                { text: "Não", style: "cancel" },
                                {
                                  text: "Sim, excluir",
                                  style: "destructive",
                                  onPress: () => {
                                    void (async () => {
                                      setDeleteAccountBusy(true);
                                      try {
                                        const { error } = await deleteAccount();
                                        if (error) {
                                          Alert.alert("Não foi possível excluir", error);
                                          return;
                                        }
                                        onClose();
                                      } finally {
                                        setDeleteAccountBusy(false);
                                      }
                                    })();
                                  },
                                },
                              ],
                            );
                          },
                        },
                      ],
                    );
                  }}
                  disabled={deleteAccountBusy}
                  style={{
                    marginTop: theme.spacing.md,
                    padding: theme.spacing.md,
                    borderRadius: radius,
                    borderWidth: 1,
                    borderColor: theme.colors.semantic.vitals,
                    backgroundColor: theme.colors.background.primary,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    opacity: deleteAccountBusy ? 0.6 : 1,
                  }}
                >
                  <FontAwesome name="trash" size={18} color={theme.colors.semantic.vitals} />
                  <Text style={{ fontWeight: "700", fontSize: 16, color: theme.colors.semantic.vitals }}>
                    {deleteAccountBusy ? "A excluir…" : "Excluir conta"}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    onSignOut();
                    onClose();
                  }}
                  style={{
                    marginTop: theme.spacing.sm,
                    padding: theme.spacing.md,
                    borderRadius: radius,
                    backgroundColor: theme.colors.background.tertiary,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  <FontAwesome name="sign-out" size={18} color={theme.colors.semantic.vitals} />
                  <Text style={{ fontWeight: "700", fontSize: 16, color: theme.colors.semantic.vitals }}>Sair da conta</Text>
                </Pressable>
              </View>
            )}

          </View>

          <View
            style={{
              paddingHorizontal: theme.spacing.md,
              paddingTop: theme.spacing.sm,
              borderTopWidth: 1,
              borderTopColor: theme.colors.border.divider,
            }}
          >
            <Text style={{ color: theme.colors.text.tertiary, fontSize: 12, textAlign: "center" }}>
              Olá, {firstName}. Aura Onco — dados protegidos por RLS.
            </Text>
          </View>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}

function SectionTitle({ children, theme, color }: { children: string; theme: ReturnType<typeof useAppTheme>["theme"]; color: string }) {
  return (
    <Text
      style={{
        fontSize: 11,
        fontWeight: "700",
        letterSpacing: 0.6,
        color,
        paddingHorizontal: theme.spacing.md,
        paddingTop: theme.spacing.md,
        paddingBottom: theme.spacing.xs,
        textTransform: "uppercase",
      }}
    >
      {children}
    </Text>
  );
}

function NotifRow({
  theme,
  cardBg,
  radius,
  title,
  subtitle,
  value,
  onValue,
  disabled,
}: {
  theme: ReturnType<typeof useAppTheme>["theme"];
  cardBg: string;
  radius: number;
  title: string;
  subtitle: string;
  value: boolean;
  onValue: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <View
      style={{
        backgroundColor: cardBg,
        borderRadius: radius,
        padding: theme.spacing.md,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <View style={{ flex: 1, paddingRight: theme.spacing.md }}>
        <Text style={[theme.typography.headline, { color: theme.colors.text.primary }]}>{title}</Text>
        <Text style={{ fontSize: 13, color: theme.colors.text.secondary, marginTop: 4 }}>{subtitle}</Text>
      </View>
      <Switch value={value} onValueChange={onValue} disabled={disabled} />
    </View>
  );
}

function ConfigRow({
  icon,
  label,
  onPress,
  theme,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  theme: ReturnType<typeof useAppTheme>["theme"];
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.md,
        gap: theme.spacing.md,
      }}
    >
      <FontAwesome name={icon as never} size={20} color={theme.colors.semantic.treatment} style={{ width: 28 }} />
      <Text style={[theme.typography.body, { color: theme.colors.text.primary, flex: 1, fontWeight: "500" }]}>{label}</Text>
      <FontAwesome name="external-link" size={14} color={theme.colors.text.tertiary} />
    </Pressable>
  );
}
