import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  InteractionManager,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { OcrReviewBottomSheet } from "@/src/exams/OcrReviewBottomSheet";
import type { OcrExtractedPayload } from "@/src/exams/ocrReviewTypes";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import type { ImagePickerAsset } from "expo-image-picker";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter, type Href } from "expo-router";
import { ResponsiveScreen } from "@/src/components/ResponsiveScreen";
import { ExamDocumentCard } from "@/src/exams/ExamDocumentCard";
import {
  EXAM_FILTER_PILLS,
  type ExamFilterPill,
  type ExamSortOrder,
  type MedicalDocRow,
  compareExamRowsByDate,
  examRowInDateRange,
  matchesExamFilter,
} from "@/src/exams/examHelpers";
import { useAuth } from "@/src/auth/AuthContext";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { usePatient } from "@/src/hooks/usePatient";
import { examMatchesSearchQuery } from "@/src/exams/examSearch";
import { getApiBaseUrl } from "@/src/lib/apiConfig";
import { afterModalCloseThen, alertPermissionToSettings } from "@/src/lib/nativePickerTiming";
import { supabase } from "@/src/lib/supabase";

const ACCENT_BLUE = "#007AFF";
const ACCENT_PURPLE = "#AF52DE";

type OcrMime = "image/jpeg" | "image/png" | "image/webp" | "image/heic" | "application/pdf";

function normalizeOcrMime(mime: string | undefined, fileName: string): OcrMime | null {
  const m = (mime ?? "").toLowerCase().split(";")[0].trim();
  const ext = fileName.toLowerCase().split(".").pop() ?? "";
  if (m === "image/jpg") return "image/jpeg";
  const allowed: OcrMime[] = ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"];
  if (allowed.includes(m as OcrMime)) return m as OcrMime;
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "heic") return "image/heic";
  if (ext === "pdf") return "application/pdf";
  return null;
}

/** iOS precisa de mais tempo após fechar o modal antes do seletor de ficheiros. */
function delayForDocumentPicker(): number | undefined {
  if (Platform.OS === "web") return 0;
  if (Platform.OS === "ios") return 520;
  if (Platform.OS === "android") return 400;
  return undefined;
}

/** Android/web: após fechar o modal, atraso antes de abrir câmera/galeria. No iOS, câmera/galeria abrem com o modal ainda visível e o modal fecha depois (ver handleCamera/handleGallery). */
function delayAfterModalForImagePicker(): number | undefined {
  if (Platform.OS === "web") return 0;
  if (Platform.OS === "ios") return 0;
  if (Platform.OS === "android") return 820;
  return undefined;
}

export default function ExamsScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const { session } = useAuth();
  const { patient, loading: patientLoading } = usePatient();
  const [filterPill, setFilterPill] = useState<ExamFilterPill>("all");
  const [advancedModalOpen, setAdvancedModalOpen] = useState(false);
  const [sortOrder, setSortOrder] = useState<ExamSortOrder>("recent");
  const [dateRangeStart, setDateRangeStart] = useState("");
  const [dateRangeEnd, setDateRangeEnd] = useState("");
  const [sourceModalOpen, setSourceModalOpen] = useState(false);
  /** OCR / envio em segundo plano — não bloqueia a lista. */
  const [ocrProcessing, setOcrProcessing] = useState(false);
  const [rows, setRows] = useState<MedicalDocRow[]>([]);
  const [reviewSheet, setReviewSheet] = useState<{ documentId: string; extracted: OcrExtractedPayload } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const canUpload = Boolean(session?.access_token && patient && !patientLoading);

  const loadDocs = useCallback(async () => {
    if (!patient) return;
    const { data, error } = await supabase
      .from("medical_documents")
      .select("id, document_type, uploaded_at, exam_performed_at, ai_extracted_json")
      .eq("patient_id", patient.id)
      .order("uploaded_at", { ascending: false })
      .limit(50);
    if (error) {
      console.warn("[exams] medical_documents:", error.message);
      return;
    }
    if (data) setRows(data as MedicalDocRow[]);
  }, [patient]);

  /** Quando o paciente deixa de carregar (ex.: após restauro de sessão), o ecrã pode já estar focado — useFocusEffect não volta a correr. */
  useEffect(() => {
    if (patient?.id) void loadDocs();
  }, [patient?.id, loadDocs]);

  useFocusEffect(
    useCallback(() => {
      void loadDocs();
    }, [loadDocs])
  );

  const filteredRows = useMemo(() => {
    const list = rows.filter(
      (r) =>
        matchesExamFilter(r, filterPill) &&
        examRowInDateRange(r, dateRangeStart, dateRangeEnd) &&
        examMatchesSearchQuery(r, searchQuery)
    );
    return [...list].sort((a, b) => compareExamRowsByDate(a, b, sortOrder));
  }, [rows, filterPill, dateRangeStart, dateRangeEnd, searchQuery, sortOrder]);

  const hasDateFilter = dateRangeStart.trim() !== "" || dateRangeEnd.trim() !== "";

  function onPressAdd() {
    if (!session?.access_token || patientLoading) {
      Alert.alert("Exames", "Faça login para adicionar documentos.");
      return;
    }
    if (!patient) {
      Alert.alert("Exames", "Complete o cadastro em Resumo para enviar laudos.");
      return;
    }
    setSourceModalOpen(true);
  }

  const runAnalyze = useCallback(
    async (
      asset: { base64: string; mime: OcrMime },
      options?: {
        openReview?: boolean;
        refreshList?: boolean;
        /** Se false, o chamador controla `ocrProcessing` (ex.: várias imagens em sequência). */
        manageOcrProcessing?: boolean;
      }
    ): Promise<{ documentId: string; extracted: OcrExtractedPayload } | null> => {
      const openReview = options?.openReview ?? true;
      const refreshList = options?.refreshList ?? true;
      const manageOcr = options?.manageOcrProcessing ?? true;
      if (!session?.access_token || !patient) {
        Alert.alert("Exames", "Faça login e complete o cadastro em Resumo.");
        return null;
      }
      setSourceModalOpen(false);
      if (manageOcr) setOcrProcessing(true);
      const url = `${getApiBaseUrl()}/api/ocr/analyze`;
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            imageBase64: asset.base64,
            mimeType: asset.mime,
          }),
        });
        const raw = await res.text();
        let data: {
          documentId?: string;
          extracted?: OcrExtractedPayload;
          error?: string;
          message?: string;
        };
        try {
          data = raw ? (JSON.parse(raw) as typeof data) : {};
        } catch {
          Alert.alert(
            "Exames",
            `O servidor devolveu uma resposta inválida (HTTP ${res.status}). Isto costuma ser página de erro ou proxy — não é falha da rede. Tente de novo em instantes.`
          );
          return null;
        }
        if (!res.ok) {
          if (res.status === 422) {
            Alert.alert(
              "Não analisado",
              data.message ?? data.error ?? "Este ficheiro não foi aceite para leitura automática (ex.: foto pessoal ou não clínica)."
            );
            return null;
          }
          Alert.alert("Exames", data.message ?? data.error ?? "Não foi possível analisar o documento.");
          return null;
        }
        if (!data.documentId || !data.extracted) {
          Alert.alert("Exames", "Resposta incompleta do servidor.");
          return null;
        }
        if (refreshList) await loadDocs();
        if (openReview) {
          setReviewSheet({ documentId: data.documentId, extracted: data.extracted });
        }
        return { documentId: data.documentId, extracted: data.extracted };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        const looksLikeTransport =
          /Network request failed|network error|Failed to fetch|NetworkError|timed out|ECONNREFUSED|ENOTUNREACH|ETIMEDOUT/i.test(
            msg
          );
        Alert.alert(
          "Exames",
          looksLikeTransport
            ? `Não foi possível ligar ao servidor em:\n${getApiBaseUrl()}\n\nConfirme: backend a correr, IP = IP do PC na rede Wi‑Fi (mobile/.env → EXPO_PUBLIC_API_URL), porta correta, e reinicie o Metro (npx expo start -c) após alterar o .env.`
            : msg
        );
        return null;
      } finally {
        if (manageOcr) setOcrProcessing(false);
      }
    },
    [loadDocs, patient, session?.access_token]
  );

  const resolveImageBase64 = useCallback(async (asset: ImagePickerAsset): Promise<string | null> => {
    if (asset.base64 && asset.base64.length > 0) return asset.base64;
    if (!asset.uri) return null;
    try {
      return await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
    } catch {
      return null;
    }
  }, []);

  const analyzeImageAsset = useCallback(
    async (
      asset: ImagePickerAsset,
      opts?: { openReview?: boolean; refreshList?: boolean; manageOcrProcessing?: boolean }
    ) => {
      const b64 = await resolveImageBase64(asset);
      if (!b64) {
        Alert.alert("Exames", "Não foi possível ler a imagem. Tente outra foto ou arquivo.");
        return null;
      }
      const name = asset.fileName ?? "imagem.jpg";
      const mime = normalizeOcrMime(asset.mimeType, name);
      if (!mime) {
        Alert.alert("Formato não suportado", "Use JPG, PNG, WEBP ou HEIC.");
        return null;
      }
      return runAnalyze({ base64: b64, mime }, opts);
    },
    [resolveImageBase64, runAnalyze]
  );

  const pickCameraAndAnalyze = useCallback(async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      if (perm.canAskAgain === false) {
        alertPermissionToSettings(
          "Permissão necessária",
          "Autorize o acesso à câmera nas definições do sistema para fotografar o laudo."
        );
      } else {
        Alert.alert("Permissão", "Precisamos da câmera para tirar a foto do laudo.");
      }
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      base64: true,
      quality: 0.7,
    });
    if (result.canceled || !result.assets?.[0]) return;
    setSourceModalOpen(false);
    await analyzeImageAsset(result.assets[0]);
  }, [analyzeImageAsset]);

  const pickGalleryAndAnalyze = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    const limited =
      Platform.OS === "ios" &&
      "accessPrivileges" in perm &&
      (perm as { accessPrivileges?: string }).accessPrivileges === "limited";
    if (!perm.granted && !limited) {
      if (perm.canAskAgain === false) {
        alertPermissionToSettings(
          "Permissão necessária",
          "Autorize o acesso às fotos nas definições do sistema para anexar o laudo."
        );
      } else {
        Alert.alert("Permissão", "Precisamos de acesso às fotos para escolher imagens.");
      }
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      base64: true,
      quality: 0.7,
      allowsMultipleSelection: true,
      selectionLimit: 12,
    });
    if (result.canceled || !result.assets?.length) return;

    setSourceModalOpen(false);

    if (result.assets.length === 1) {
      await analyzeImageAsset(result.assets[0]);
      return;
    }

    setOcrProcessing(true);
    let lastOk: { documentId: string; extracted: OcrExtractedPayload } | null = null;
    try {
      for (const asset of result.assets) {
        const r = await analyzeImageAsset(asset, {
          openReview: false,
          refreshList: false,
          manageOcrProcessing: false,
        });
        if (r) lastOk = r;
      }
      await loadDocs();
      if (lastOk) {
        setReviewSheet({ documentId: lastOk.documentId, extracted: lastOk.extracted });
      } else {
        Alert.alert("Exames", "Não foi possível analisar as imagens selecionadas.");
      }
    } finally {
      setOcrProcessing(false);
    }
  }, [analyzeImageAsset, loadDocs]);

  const scheduleAfterSourceModal = useCallback((fn: () => Promise<void>) => {
    setSourceModalOpen(false);
    afterModalCloseThen(
      async () => {
        await new Promise<void>((resolve) => {
          InteractionManager.runAfterInteractions(() => resolve());
        });
        await fn();
      },
      (e) => Alert.alert("Exames", e instanceof Error ? e.message : String(e)),
      delayAfterModalForImagePicker()
    );
  }, []);

  const pickDocumentAndAnalyze = useCallback(async () => {
    await new Promise<void>((resolve) => {
      InteractionManager.runAfterInteractions(() => resolve());
    });
    let result: Awaited<ReturnType<typeof DocumentPicker.getDocumentAsync>>;
    try {
      result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });
    } catch (e) {
      Alert.alert("Exames", e instanceof Error ? e.message : "Não foi possível abrir o seletor de arquivos.");
      return;
    }
    if (result.canceled || !result.assets?.length) return;

    const a = result.assets[0];
    const mime = normalizeOcrMime(a.mimeType, a.name);
    if (!mime) {
      Alert.alert("Formato não suportado", "Use PDF ou imagem (JPG, PNG, WEBP, HEIC).");
      return;
    }
    if (a.size != null && a.size > 18 * 1024 * 1024) {
      Alert.alert("Arquivo grande", "Escolha um arquivo menor que ~18 MB.");
      return;
    }

    setSourceModalOpen(false);

    let b64: string;
    try {
      if (Platform.OS === "web" && a.base64) {
        b64 = a.base64;
      } else {
        b64 = await FileSystem.readAsStringAsync(a.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
      }
    } catch (e) {
      Alert.alert("Exames", e instanceof Error ? e.message : "Não foi possível ler o arquivo.");
      return;
    }

    await runAnalyze({ base64: b64, mime });
  }, [runAnalyze]);

  const handleCamera = useCallback(() => {
    if (Platform.OS === "ios") {
      void (async () => {
        try {
          await pickCameraAndAnalyze();
        } catch (e) {
          Alert.alert("Exames", e instanceof Error ? e.message : String(e));
        } finally {
          setSourceModalOpen(false);
        }
      })();
      return;
    }
    scheduleAfterSourceModal(pickCameraAndAnalyze);
  }, [pickCameraAndAnalyze, scheduleAfterSourceModal]);

  const handleGallery = useCallback(() => {
    if (Platform.OS === "ios") {
      void (async () => {
        try {
          await pickGalleryAndAnalyze();
        } catch (e) {
          Alert.alert("Exames", e instanceof Error ? e.message : String(e));
        } finally {
          setSourceModalOpen(false);
        }
      })();
      return;
    }
    scheduleAfterSourceModal(pickGalleryAndAnalyze);
  }, [pickGalleryAndAnalyze, scheduleAfterSourceModal]);

  const handleFile = useCallback(() => {
    /** iOS e Android: fechar o modal e esperar (520 ms / 400 ms) antes do DocumentPicker — evita corrida com a animação do modal e falhas intermitentes no primeiro envio. */
    setSourceModalOpen(false);
    afterModalCloseThen(
      pickDocumentAndAnalyze,
      (e) => Alert.alert("Exames", e instanceof Error ? e.message : "Não foi possível escolher o arquivo."),
      delayForDocumentPicker()
    );
  }, [pickDocumentAndAnalyze]);

  const cardShadow =
    Platform.OS === "ios"
      ? {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
        }
      : { elevation: 3 };

  return (
    <ResponsiveScreen variant="tabGradient">
      <ScrollView
        style={{ flex: 1, backgroundColor: "transparent" }}
        contentContainerStyle={{ paddingBottom: theme.spacing.xl * 2, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
        <View style={{ paddingTop: theme.spacing.md }}>
          <Text style={[theme.typography.largeTitle, { color: theme.colors.text.primary }]}>Exames</Text>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: theme.spacing.sm,
              gap: theme.spacing.md,
            }}
          >
            <Text
              style={[
                theme.typography.body,
                { color: theme.colors.text.secondary, flex: 1, flexShrink: 1, minWidth: 0 },
              ]}
              numberOfLines={2}
            >
              Laudos e exames
            </Text>
            <Pressable
              onPress={onPressAdd}
              disabled={ocrProcessing}
              hitSlop={8}
              style={{ flexShrink: 0 }}
              accessibilityRole="button"
              accessibilityLabel="Adicionar documento"
            >
              <Text
                style={{
                  fontSize: 17,
                  fontWeight: "600",
                  color: canUpload && !ocrProcessing ? "#007AFF" : theme.colors.text.tertiary,
                }}
              >
                Adicionar
              </Text>
            </Pressable>
          </View>

          <View style={{ marginTop: theme.spacing.sm }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: theme.spacing.sm,
                paddingHorizontal: theme.spacing.md,
                paddingVertical: Platform.OS === "ios" ? 12 : 8,
                borderRadius: 14,
                backgroundColor: theme.colors.background.primary,
                borderWidth: 1,
                borderColor: theme.colors.border.divider,
              }}
            >
              <FontAwesome name="search" size={18} color={theme.colors.text.tertiary} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Pesquisar (ex.: hemograma, imagem, cabeça…)"
                placeholderTextColor={theme.colors.text.tertiary}
                style={{
                  flex: 1,
                  minHeight: 40,
                  fontSize: 16,
                  color: theme.colors.text.primary,
                  paddingVertical: 4,
                }}
                autoCorrect
                autoCapitalize="none"
                {...(Platform.OS === "ios" ? { clearButtonMode: "while-editing" as const } : {})}
                returnKeyType="search"
                accessibilityLabel="Pesquisar exames"
              />
            </View>
            <Text style={{ fontSize: 12, color: theme.colors.text.tertiary, marginTop: 6, marginLeft: 4 }}>
              Procura no tipo de documento, título, resumo da IA e nomes de parâmetros.
            </Text>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm, marginTop: theme.spacing.xs }}>
            <ScrollView
              horizontal
              nestedScrollEnabled
              showsHorizontalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              style={{ flex: 1, minWidth: 0 }}
              contentContainerStyle={{
                flexDirection: "row",
                alignItems: "center",
                gap: theme.spacing.sm,
                paddingVertical: theme.spacing.md,
                paddingRight: theme.spacing.sm,
              }}
            >
              {EXAM_FILTER_PILLS.map((p) => {
                const active = filterPill === p.key;
                return (
                  <Pressable
                    key={p.key}
                    onPress={() => setFilterPill(p.key)}
                    style={{
                      paddingHorizontal: theme.spacing.md,
                      paddingVertical: 10,
                      borderRadius: 999,
                      backgroundColor: active ? "#007AFF" : theme.colors.background.primary,
                      borderWidth: active ? 0 : 1,
                      borderColor: theme.colors.border.divider,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: "600",
                        color: active ? "#FFFFFF" : theme.colors.text.primary,
                      }}
                    >
                      {p.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <Pressable
              onPress={() => setAdvancedModalOpen(true)}
              hitSlop={8}
              style={{
                flexShrink: 0,
                paddingVertical: 10,
                paddingHorizontal: theme.spacing.sm,
                borderRadius: theme.radius.md,
                backgroundColor: hasDateFilter ? "rgba(0,122,255,0.12)" : theme.colors.background.primary,
                borderWidth: 1,
                borderColor: hasDateFilter ? "#007AFF" : theme.colors.border.divider,
              }}
              accessibilityRole="button"
              accessibilityLabel="Filtros avançados"
            >
              <FontAwesome name="sliders" size={20} color="#007AFF" />
            </Pressable>
          </View>
        </View>

        <View style={{ marginTop: theme.spacing.sm, flex: 1 }}>
          {patientLoading ? (
            <View style={{ paddingVertical: theme.spacing.xl * 2, alignItems: "center" }}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: theme.spacing.md }]}>
                Carregando…
              </Text>
            </View>
          ) : !patient ? (
            <View
              style={{
                marginTop: theme.spacing.lg,
                padding: theme.spacing.lg,
                borderRadius: theme.radius.lg,
                backgroundColor: theme.colors.background.primary,
                borderWidth: 1,
                borderColor: theme.colors.border.divider,
              }}
            >
              <Text style={[theme.typography.body, { color: theme.colors.text.secondary }]}>
                Complete o cadastro em Resumo para listar e enviar laudos com leitura assistida por IA.
              </Text>
            </View>
          ) : (
            <>
              {ocrProcessing ? (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: theme.spacing.sm,
                    marginBottom: theme.spacing.md,
                    paddingVertical: theme.spacing.sm,
                    paddingHorizontal: theme.spacing.md,
                    borderRadius: theme.radius.md,
                    backgroundColor: "rgba(0, 122, 255, 0.08)",
                    borderWidth: 1,
                    borderColor: "rgba(0, 122, 255, 0.25)",
                  }}
                  accessibilityLiveRegion="polite"
                  accessibilityLabel="A analisar o documento"
                >
                  <ActivityIndicator size="small" color="#007AFF" />
                  <Text style={[theme.typography.body, { color: theme.colors.text.primary, flex: 1 }]}>
                    A enviar e a analisar o documento…
                  </Text>
                </View>
              ) : null}
              {filteredRows.length === 0 ? (
                <View
                  style={{
                    marginTop: theme.spacing.lg,
                    padding: theme.spacing.lg,
                    borderRadius: theme.radius.lg,
                    backgroundColor: theme.colors.background.primary,
                    borderWidth: 1,
                    borderColor: theme.colors.border.divider,
                  }}
                >
                  <Text style={[theme.typography.body, { color: theme.colors.text.secondary, textAlign: "center" }]}>
                    {rows.length === 0
                      ? "Nenhum exame ainda. Toque em Adicionar para enviar foto ou arquivo do laudo."
                      : rows.length > 0 && filteredRows.length === 0
                        ? "Nenhum exame corresponde à pesquisa, aos filtros ou ao intervalo de datas. Ajuste ou limpe em Filtros avançados."
                        : "Nenhum documento neste filtro ou intervalo. Ajuste as pílulas ou os filtros avançados."}
                  </Text>
                </View>
              ) : (
                filteredRows.map((r) => (
                  <Pressable
                    key={r.id}
                    onPress={() => router.push({ pathname: "/(tabs)/exams/[id]", params: { id: r.id } } as Href)}
                    accessibilityRole="button"
                    accessibilityLabel="Abrir detalhes do exame"
                  >
                    <ExamDocumentCard theme={theme} row={r} />
                  </Pressable>
                ))
              )}
            </>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={advancedModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setAdvancedModalOpen(false)}
      >
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)" }} onPress={() => setAdvancedModalOpen(false)}>
          <View style={{ flex: 1, justifyContent: "flex-end" }}>
            <Pressable
              onPress={(e) => e.stopPropagation()}
              style={{
                backgroundColor: theme.colors.background.primary,
                borderTopLeftRadius: theme.radius.xl,
                borderTopRightRadius: theme.radius.xl,
                padding: theme.spacing.lg,
                paddingBottom: theme.spacing.xl,
              }}
            >
              <Text style={[theme.typography.title2, { color: theme.colors.text.primary }]}>Filtros avançados</Text>
              <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: theme.spacing.xs }]}>
                Ordenação e intervalo de datas (data do exame ou registo).
              </Text>

              <Text style={{ fontSize: 13, fontWeight: "700", color: theme.colors.text.primary, marginTop: theme.spacing.lg }}>
                Ordenar por
              </Text>
              <View style={{ flexDirection: "row", gap: theme.spacing.sm, marginTop: theme.spacing.sm }}>
                <Pressable
                  onPress={() => setSortOrder("recent")}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: 12,
                    backgroundColor: sortOrder === "recent" ? "#007AFF" : theme.colors.background.secondary,
                    alignItems: "center",
                    borderWidth: sortOrder === "recent" ? 0 : 1,
                    borderColor: theme.colors.border.divider,
                  }}
                >
                  <Text style={{ fontWeight: "600", color: sortOrder === "recent" ? "#FFFFFF" : theme.colors.text.primary }}>
                    Mais recentes
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setSortOrder("oldest")}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: 12,
                    backgroundColor: sortOrder === "oldest" ? "#007AFF" : theme.colors.background.secondary,
                    alignItems: "center",
                    borderWidth: sortOrder === "oldest" ? 0 : 1,
                    borderColor: theme.colors.border.divider,
                  }}
                >
                  <Text style={{ fontWeight: "600", color: sortOrder === "oldest" ? "#FFFFFF" : theme.colors.text.primary }}>
                    Mais antigos
                  </Text>
                </Pressable>
              </View>

              <Text style={{ fontSize: 13, fontWeight: "700", color: theme.colors.text.primary, marginTop: theme.spacing.lg }}>
                Intervalo de datas (AAAA-MM-DD)
              </Text>
              <View style={{ flexDirection: "row", gap: theme.spacing.sm, marginTop: theme.spacing.sm, alignItems: "center" }}>
                <TextInput
                  value={dateRangeStart}
                  onChangeText={setDateRangeStart}
                  placeholder="Início"
                  placeholderTextColor={theme.colors.text.tertiary}
                  keyboardType="numbers-and-punctuation"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={{
                    flex: 1,
                    borderWidth: 1,
                    borderColor: theme.colors.border.divider,
                    borderRadius: 12,
                    padding: theme.spacing.md,
                    fontSize: 16,
                    color: theme.colors.text.primary,
                  }}
                />
                <Text style={{ color: theme.colors.text.secondary }}>—</Text>
                <TextInput
                  value={dateRangeEnd}
                  onChangeText={setDateRangeEnd}
                  placeholder="Fim"
                  placeholderTextColor={theme.colors.text.tertiary}
                  keyboardType="numbers-and-punctuation"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={{
                    flex: 1,
                    borderWidth: 1,
                    borderColor: theme.colors.border.divider,
                    borderRadius: 12,
                    padding: theme.spacing.md,
                    fontSize: 16,
                    color: theme.colors.text.primary,
                  }}
                />
              </View>
              <Pressable
                onPress={() => {
                  setDateRangeStart("");
                  setDateRangeEnd("");
                }}
                style={{ marginTop: theme.spacing.md, alignSelf: "flex-start" }}
              >
                <Text style={{ color: "#007AFF", fontWeight: "600" }}>Limpar intervalo</Text>
              </Pressable>

              <Pressable
                onPress={() => setAdvancedModalOpen(false)}
                style={{
                  marginTop: theme.spacing.lg,
                  backgroundColor: "#007AFF",
                  paddingVertical: 14,
                  borderRadius: 14,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 17 }}>Aplicar</Text>
              </Pressable>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <Modal
        visible={sourceModalOpen}
        transparent
        animationType={Platform.OS === "android" ? "none" : "slide"}
        statusBarTranslucent
        hardwareAccelerated
        onRequestClose={() => setSourceModalOpen(false)}
      >
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }} onPress={() => setSourceModalOpen(false)}>
          <View style={{ flex: 1, justifyContent: "flex-end" }}>
            <Pressable
              onPress={(e) => e.stopPropagation()}
              style={{
                backgroundColor: theme.colors.background.secondary,
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                padding: theme.spacing.lg,
                paddingBottom: theme.spacing.xl,
              }}
            >
              <Text
                style={[theme.typography.title2, { color: theme.colors.text.primary, marginBottom: theme.spacing.xs }]}
              >
                Adicionar documento
              </Text>
              <Text
                style={[theme.typography.body, { color: theme.colors.text.secondary, marginBottom: theme.spacing.lg }]}
              >
                A IA identifica o tipo de documento (exame, laudo, imagem) e extrai os dados.
              </Text>

              <Pressable
                onPress={handleCamera}
                style={[
                  {
                    backgroundColor: "#FFFFFF",
                    borderRadius: 16,
                    paddingVertical: theme.spacing.lg,
                    paddingHorizontal: theme.spacing.md,
                    alignItems: "center",
                    marginBottom: theme.spacing.sm,
                  },
                  cardShadow,
                ]}
              >
                <FontAwesome name="camera" size={36} color={ACCENT_BLUE} style={{ marginBottom: theme.spacing.sm }} />
                <Text style={[theme.typography.headline, { color: theme.colors.text.primary }]}>Tirar foto</Text>
                <Text style={{ fontSize: 14, color: theme.colors.text.secondary, marginTop: 6, textAlign: "center" }}>
                  Usar a câmera agora
                </Text>
              </Pressable>

              <Pressable
                onPress={handleGallery}
                style={[
                  {
                    backgroundColor: "#FFFFFF",
                    borderRadius: 16,
                    paddingVertical: theme.spacing.lg,
                    paddingHorizontal: theme.spacing.md,
                    alignItems: "center",
                    marginBottom: theme.spacing.sm,
                  },
                  cardShadow,
                ]}
              >
                <FontAwesome name="picture-o" size={36} color={ACCENT_BLUE} style={{ marginBottom: theme.spacing.sm }} />
                <Text style={[theme.typography.headline, { color: theme.colors.text.primary }]}>Escolher da galeria</Text>
                <Text style={{ fontSize: 14, color: theme.colors.text.secondary, marginTop: 6, textAlign: "center" }}>
                  Uma ou várias fotos; cada uma é enviada ao servidor, gravada e analisada pela IA (como o PDF).
                </Text>
              </Pressable>

              <Pressable
                onPress={handleFile}
                style={[
                  {
                    backgroundColor: "#FFFFFF",
                    borderRadius: 16,
                    paddingVertical: theme.spacing.lg,
                    paddingHorizontal: theme.spacing.md,
                    alignItems: "center",
                    marginBottom: theme.spacing.md,
                  },
                  cardShadow,
                ]}
              >
                <FontAwesome name="folder-open" size={36} color={ACCENT_PURPLE} style={{ marginBottom: theme.spacing.sm }} />
                <Text style={[theme.typography.headline, { color: theme.colors.text.primary }]}>Procurar arquivo</Text>
                <Text style={{ fontSize: 14, color: theme.colors.text.secondary, marginTop: 6, textAlign: "center" }}>
                  PDF ou imagem nos ficheiros
                </Text>
              </Pressable>

              <Pressable onPress={() => setSourceModalOpen(false)} style={{ alignItems: "center", paddingVertical: theme.spacing.sm }}>
                <Text style={{ color: ACCENT_BLUE, fontSize: 17, fontWeight: "600" }}>Cancelar</Text>
              </Pressable>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <OcrReviewBottomSheet
        visible={reviewSheet !== null}
        patientId={patient?.id ?? null}
        documentId={reviewSheet?.documentId ?? null}
        extracted={reviewSheet?.extracted ?? null}
        onClose={() => setReviewSheet(null)}
        onSaved={() => void loadDocs()}
      />
    </ResponsiveScreen>
  );
}
