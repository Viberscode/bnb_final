"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Mic, Square, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/i18n/language-provider";
import { VoiceNotePlayer } from "@/components/request-help/voice-note-player";

const MAX_SECONDS = 45;

function pickMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const types = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];
  return types.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

export function VoiceNoteRecorder({
  blob,
  onChange,
}: {
  blob: Blob | null;
  onChange: (next: Blob | null) => void;
}) {
  const { t } = useLanguage();
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!blob) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(blob);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [blob]);

  useEffect(() => {
    return () => {
      stopTracks();
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, []);

  function stopTracks() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  function clearTimer() {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  async function startRecording() {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError(t("voice.needBrowser"));
      return;
    }

    setBusy(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const mimeType = pickMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const type = recorder.mimeType || mimeType || "audio/webm";
        const next = new Blob(chunksRef.current, { type });
        chunksRef.current = [];
        stopTracks();
        setRecording(false);
        clearTimer();
        if (next.size > 0) onChange(next);
      };

      recorder.start(250);
      setSeconds(0);
      setRecording(true);
      timerRef.current = window.setInterval(() => {
        setSeconds((prev) => {
          const next = prev + 1;
          if (next >= MAX_SECONDS) {
            recorder.stop();
            return MAX_SECONDS;
          }
          return next;
        });
      }, 1000);
    } catch {
      stopTracks();
      setError(t("voice.needMic"));
    } finally {
      setBusy(false);
    }
  }

  function stopRecording() {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
  }

  return (
    <div className="mt-2.5">
      {previewUrl && blob && !recording ? (
        <div className="space-y-2">
          <VoiceNotePlayer src={previewUrl} compact />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                onChange(null);
                void startRecording();
              }}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl border-2 border-crimson/20 bg-white px-3 text-xs font-black uppercase tracking-[0.08em] text-crimson hover:bg-crimson-soft"
            >
              <Mic className="size-3.5" aria-hidden />
              {t("voice.rerecord")}
            </button>
            <button
              type="button"
              onClick={() => onChange(null)}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl border-2 border-ink/10 bg-white px-3 text-xs font-black uppercase tracking-[0.08em] text-ink-muted hover:bg-black/[0.03] hover:text-ink"
            >
              <Trash2 className="size-3.5" aria-hidden />
              {t("voice.remove")}
            </button>
          </div>
        </div>
      ) : recording ? (
        <div className="flex items-center gap-3 rounded-2xl border-2 border-crimson bg-[#fff1f3] px-3 py-2.5">
          <span className="relative inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-crimson text-white">
            <span className="absolute inset-0 animate-ping rounded-xl bg-crimson/50" />
            <Mic className="relative size-4" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-crimson">{t("voice.recording")}</p>
            <p className="text-xs font-semibold tabular-nums text-ink-muted">
              0:{String(seconds).padStart(2, "0")} / 0:{String(MAX_SECONDS).padStart(2, "0")}
            </p>
          </div>
          <button
            type="button"
            onClick={stopRecording}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-ink px-3 text-xs font-black uppercase tracking-[0.08em] text-white"
          >
            <Square className="size-3 fill-current" aria-hidden />
            {t("voice.stop")}
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => void startRecording()}
          className={cn(
            "inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-crimson/35 bg-crimson-soft/60 px-4 text-sm font-black text-crimson transition hover:border-crimson hover:bg-crimson-soft disabled:opacity-70 sm:w-auto",
          )}
        >
          {busy ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Mic className="size-4" aria-hidden />
          )}
          {t("voice.addNote")}
        </button>
      )}
      {error ? (
        <p className="mt-2 text-xs font-semibold text-crimson" role="alert">
          {error}
        </p>
      ) : (
        <p className="mt-1.5 text-xs font-medium text-ink-muted">
          {t("voice.hint")}
        </p>
      )}
    </div>
  );
}
