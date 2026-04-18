import { useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";

function mergeDatePart(base: Date, from: Date): Date {
  const n = new Date(base);
  n.setFullYear(from.getFullYear(), from.getMonth(), from.getDate());
  return n;
}

function mergeTimePart(base: Date, from: Date): Date {
  const n = new Date(base);
  n.setHours(from.getHours(), from.getMinutes(), 0, 0);
  return n;
}

type Props = {
  value: Date;
  onChange: (next: Date) => void;
  /** Cor do texto do resumo (ex.: theme.colors.semantic.treatment) */
  accentColor?: string;
  /** Cor do texto secundário */
  secondaryColor?: string;
};

/**
 * No Android, `mode="datetime"` não existe na API nativa — o pacote abre data com `default`,
 * mas no unmount chama `dismiss("datetime")` e `pickers.datetime` é `undefined` → crash.
 * Este componente usa `date` + `time` em sequência (igual ao padrão em calendar.tsx).
 */
export function AndroidDateTimePicker({ value, onChange, accentColor = "#5E5CE6", secondaryColor = "#8E8E93" }: Props) {
  const [step, setStep] = useState<null | "date" | "time">(null);

  if (Platform.OS !== "android") {
    return null;
  }

  return (
    <>
      <Pressable onPress={() => setStep("date")} style={{ marginTop: 4 }}>
        <Text style={{ color: accentColor, fontSize: 17 }}>
          {value.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
        </Text>
        <Text style={{ color: secondaryColor, fontSize: 12, marginTop: 4 }}>Toque para alterar data e hora</Text>
      </Pressable>

      {step === "date" ? (
        <DateTimePicker
          value={value}
          mode="date"
          display="default"
          onChange={(event: DateTimePickerEvent, d) => {
            if (event.type === "dismissed") {
              setStep(null);
              return;
            }
            if (d) {
              onChange(mergeDatePart(value, d));
              setStep("time");
            } else {
              setStep(null);
            }
          }}
        />
      ) : null}

      {step === "time" ? (
        <DateTimePicker
          value={value}
          mode="time"
          display="default"
          onChange={(event: DateTimePickerEvent, t) => {
            setStep(null);
            if (event.type === "dismissed") return;
            if (t) onChange(mergeTimePart(value, t));
          }}
        />
      ) : null}
    </>
  );
}
