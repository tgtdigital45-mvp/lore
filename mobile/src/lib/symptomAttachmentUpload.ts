import { supabase } from "@/src/lib/supabase";

/** Caminho relativo no bucket `symptom_attachments` (pasta = patient_id). */
export async function uploadSymptomAttachment(patientId: string, localUri: string): Promise<string | null> {
  try {
    const ext = localUri.split(".").pop()?.toLowerCase();
    const safe = ext && ext.length <= 5 ? ext : "jpg";
    const path = `${patientId}/${Date.now()}.${safe}`;
    const res = await fetch(localUri);
    const buf = await res.arrayBuffer();
    const ct =
      safe === "png"
        ? "image/png"
        : safe === "webp"
          ? "image/webp"
          : safe === "heic"
            ? "image/heic"
            : "image/jpeg";
    const { error } = await supabase.storage.from("symptom_attachments").upload(path, buf, {
      contentType: ct,
      upsert: false,
    });
    if (error) return null;
    return path;
  } catch {
    return null;
  }
}
