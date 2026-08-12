import { tryCreateClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

const BUCKET = "request-voice-notes";
const MAX_BYTES = 1_500_000;

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Could not read the voice note."));
    };
    reader.onerror = () => reject(new Error("Could not read the voice note."));
    reader.readAsDataURL(blob);
  });
}

function extensionFor(blob: Blob): string {
  if (blob.type.includes("mp4")) return "mp4";
  if (blob.type.includes("ogg")) return "ogg";
  if (blob.type.includes("mpeg") || blob.type.includes("mp3")) return "mp3";
  return "webm";
}

/** Upload a recorded note; falls back to an inline data URL if storage is not set up. */
export async function uploadVoiceNote(
  blob: Blob,
  userId: string,
): Promise<string> {
  if (blob.size > MAX_BYTES) {
    throw new Error("Voice note is too long. Keep it under 45 seconds.");
  }

  const supabase = tryCreateClient();
  if (!supabase || !isSupabaseConfigured()) {
    return blobToDataUrl(blob);
  }

  const path = `${userId}/${crypto.randomUUID()}.${extensionFor(blob)}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: blob.type || "audio/webm",
    upsert: false,
  });

  if (error) {
    return blobToDataUrl(blob);
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
