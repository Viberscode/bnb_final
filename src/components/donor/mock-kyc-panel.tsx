"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  Camera,
  IdCard,
  Loader2,
  ScanLine,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage, type MessagePath } from "@/components/i18n/language-provider";

type KycPhase = "idle" | "active" | "scanning" | "verified";

type CameraFacing = "user" | "environment";

const SCAN_STEPS = [
  {
    id: "id-front",
    title: "kyc.frontTitle",
    hint: "kyc.frontHint",
    action: "kyc.frontAction",
    facing: "environment" as CameraFacing,
    usesCamera: true,
  },
  {
    id: "id-back",
    title: "kyc.backTitle",
    hint: "kyc.backHint",
    action: "kyc.backAction",
    facing: "environment" as CameraFacing,
    usesCamera: true,
  },
  {
    id: "face",
    title: "kyc.faceTitle",
    hint: "kyc.faceHint",
    action: "kyc.faceAction",
    facing: "user" as CameraFacing,
    usesCamera: true,
  },
  {
    id: "confirm",
    title: "kyc.confirmTitle",
    hint: "kyc.confirmHint",
    action: "kyc.confirmAction",
    facing: null,
    usesCamera: false,
  },
] as const satisfies readonly {
  id: string;
  title: MessagePath;
  hint: MessagePath;
  action: MessagePath;
  facing: CameraFacing | null;
  usesCamera: boolean;
}[];

function useKycCamera(
  facing: CameraFacing | null,
  enabled: boolean,
  retryKey: number,
) {
  const { t } = useLanguage();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    const video = videoRef.current;
    if (video) video.srcObject = null;
    setReady(false);
  }, []);

  useEffect(() => {
    if (!enabled || !facing) {
      stop();
      setError(null);
      return;
    }

    const facingMode = facing;
    let cancelled = false;

    async function start() {
      stop();
      setError(null);
      setReady(false);

      if (!navigator.mediaDevices?.getUserMedia) {
        setError(t("kyc.noCamera"));
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play();
        }
        setReady(true);
      } catch {
        setError(
          t("kyc.cameraFail"),
        );
      }
    }

    void start();

    return () => {
      cancelled = true;
      stop();
    };
  }, [enabled, facing, retryKey, stop]);

  const captureFrame = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return null;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0);
    return canvas.toDataURL("image/jpeg", 0.82);
  }, []);

  return { videoRef, ready, error, captureFrame, stop };
}

interface MockKycPanelProps {
  skip?: boolean;
  onVerifiedChange: (verified: boolean) => void;
}

export function MockKycPanel({ skip = false, onVerifiedChange }: MockKycPanelProps) {
  const { t } = useLanguage();
  const [phase, setPhase] = useState<KycPhase>(skip ? "verified" : "idle");
  const [step, setStep] = useState(0);
  const [captures, setCaptures] = useState<string[]>([]);
  const [cameraKey, setCameraKey] = useState(0);

  const current = SCAN_STEPS[step];
  const cameraEnabled =
    phase === "active" && current.usesCamera && !skip;
  const facing = current.usesCamera ? current.facing : null;

  const { videoRef, ready, error, captureFrame, stop } = useKycCamera(
    facing,
    cameraEnabled,
    cameraKey,
  );

  useEffect(() => {
    onVerifiedChange(phase === "verified" || skip);
  }, [phase, skip, onVerifiedChange]);

  useEffect(() => {
    if (skip) {
      setPhase("verified");
    }
  }, [skip]);

  function begin() {
    if (phase === "verified") return;
    setPhase("active");
    setStep(0);
    setCaptures([]);
  }

  function retryCamera() {
    stop();
    setCameraKey((k) => k + 1);
  }

  function completeStep() {
    if (phase !== "active") return;

    setPhase("scanning");

    if (current.usesCamera) {
      const frame = captureFrame();
      if (frame) setCaptures((prev) => [...prev, frame]);
      stop();
    }

    window.setTimeout(() => {
      const next = step + 1;
      if (next >= SCAN_STEPS.length) {
        setPhase("verified");
      } else {
        setStep(next);
        setPhase("active");
      }
    }, 1200);
  }

  const progress =
    phase === "verified"
      ? 100
      : Math.round((step / SCAN_STEPS.length) * 100);

  if (skip) {
    return (
      <p className="text-sm font-semibold text-ink-muted">
        {t("kyc.skip")}
      </p>
    );
  }

  return (
    <div className="rounded-2xl border border-indigo-200/80 bg-gradient-to-br from-indigo-50/90 to-violet-50/70 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-700 text-white shadow-[0_12px_24px_-12px_rgba(79,70,229,0.65)]">
          <IdCard className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-base font-extrabold text-ink">
            {t("kyc.title")}
          </p>
          <p className="mt-1 text-sm text-ink-muted">
            {t("kyc.body")}
          </p>
        </div>
        {phase === "verified" ? (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-800">
            <CheckCircle2 className="size-3.5" aria-hidden />
            {t("kyc.verified")}
          </span>
        ) : null}
      </div>

      {phase === "verified" ? (
        <p className="mt-4 flex items-center gap-2 text-sm font-bold text-emerald-700">
          <CheckCircle2 className="size-4" aria-hidden />
          {t("kyc.complete")}
        </p>
      ) : phase === "idle" ? (
        <button
          type="button"
          onClick={begin}
          className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-sm font-extrabold text-white shadow-[0_14px_32px_-14px_rgba(79,70,229,0.65)] transition hover:-translate-y-0.5 hover:brightness-110 sm:w-auto sm:px-8"
        >
          <ShieldCheck className="size-4" aria-hidden />
          {t("kyc.begin")}
        </button>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="h-2 overflow-hidden rounded-full bg-indigo-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-700">
            {t("kyc.stepOf", { n: step + 1, total: SCAN_STEPS.length })} · {t(current.title)}
          </p>

          {current.usesCamera ? (
            <div
              key={`${current.id}-${cameraKey}`}
              className={cn(
                "relative overflow-hidden rounded-2xl border-2 bg-black",
                phase === "scanning"
                  ? "border-violet-400"
                  : ready
                    ? "border-emerald-400/70"
                    : "border-indigo-300/60",
              )}
            >
              <video
                ref={videoRef}
                className="aspect-[4/3] w-full object-cover"
                playsInline
                muted
                autoPlay
              />

              {/* Scanner overlay */}
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/40" />
                {current.id === "face" ? (
                  <div className="absolute inset-0 flex items-center justify-center p-6">
                    <div
                      className="size-44 rounded-full border-2 border-dashed border-white/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]"
                      aria-hidden
                    />
                  </div>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center p-5 sm:p-8">
                    <div
                      className="h-36 w-full max-w-sm rounded-xl border-2 border-dashed border-white/75 sm:h-40"
                      aria-hidden
                    />
                  </div>
                )}
                <p className="absolute bottom-3 left-3 right-3 text-center text-xs font-bold text-white/90">
                  {phase === "scanning"
                    ? t("kyc.processing")
                    : ready
                      ? t(current.hint)
                      : t("kyc.opening")}
                </p>
              </div>

              {!ready && !error && phase === "active" ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                  <Loader2 className="size-8 animate-spin text-white" aria-hidden />
                </div>
              ) : null}
            </div>
          ) : (
            <div className="rounded-2xl border border-indigo-200 bg-white/90 p-4">
              <p className="text-sm font-bold text-ink">{t(current.hint)}</p>
              {captures.length > 0 ? (
                <div className="mt-3 flex gap-2">
                  {captures.map((src, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={i}
                      src={src}
                      alt={t("kyc.scanAlt", { n: i + 1 })}
                      className="size-16 rounded-lg border border-line object-cover"
                    />
                  ))}
                </div>
              ) : null}
            </div>
          )}

          {error ? (
            <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 text-sm font-semibold text-amber-900">
              {error}
              <button
                type="button"
                onClick={retryCamera}
                className="mt-2 text-xs font-bold text-indigo-700 underline"
              >
                {t("kyc.retry")}
              </button>
            </div>
          ) : null}

          <button
            type="button"
            onClick={completeStep}
            disabled={
              phase === "scanning" ||
              (current.usesCamera && !ready && !error)
            }
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-sm font-extrabold text-white shadow-[0_14px_32px_-14px_rgba(79,70,229,0.65)] transition hover:-translate-y-0.5 hover:brightness-110 disabled:opacity-70 sm:w-auto sm:px-8"
          >
            {phase === "scanning" ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                {t("kyc.processingShort")}
              </>
            ) : current.usesCamera ? (
              <>
                <Camera className="size-4" aria-hidden />
                {t(current.action)}
              </>
            ) : (
              <>
                <ScanLine className="size-4" aria-hidden />
                {t(current.action)}
              </>
            )}
          </button>

          <ul className="space-y-1.5">
            {SCAN_STEPS.map((s, index) => {
              const done = index < step;
              const active =
                index === step && (phase === "active" || phase === "scanning");
              return (
                <li
                  key={s.id}
                  className={cn(
                    "flex items-center gap-2 text-xs font-semibold",
                    done && "text-emerald-700",
                    active && "text-indigo-700",
                    !done && !active && "text-ink-muted/55",
                  )}
                >
                  {done ? (
                    <CheckCircle2 className="size-3.5 shrink-0" aria-hidden />
                  ) : active ? (
                    <Loader2
                      className={cn(
                        "size-3.5 shrink-0",
                        phase === "scanning" && "animate-spin",
                      )}
                      aria-hidden
                    />
                  ) : (
                    <span
                      className="size-3.5 shrink-0 rounded-full border border-indigo-200"
                      aria-hidden
                    />
                  )}
                  {t(s.title)}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
