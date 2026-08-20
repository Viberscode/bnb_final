"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  Hospital as HospitalIcon,
  Loader2,
  Mic,
  Phone,
  X,
} from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { useLanguage } from "@/components/i18n/language-provider";
import type { MessagePath } from "@/components/i18n/language-provider";
import { DEMO_HOSPITALS } from "@/data/demo";
import { useLiveLocation } from "@/hooks/use-live-location";
import { startAssignmentForRequest } from "@/lib/donor-assignment";
import { fetchAvailableDonors } from "@/lib/donor-profile";
import {
  formatDistance,
  getNearbyPlaces,
  distanceKm,
} from "@/lib/geo";
import {
  addLiveRequest,
  fetchActiveRequestForUser,
} from "@/lib/live-requests";
import { MESSAGES, type Locale, type Messages } from "@/lib/i18n/messages";
import { cn } from "@/lib/utils";
import {
  detectSpeechLocale,
  hasSpeechSupport,
  parseBloodGroups,
  parseHospital,
  parseIntent,
  parseName,
  parsePatientsCount,
  parsePhone,
  parseUnits,
  parseUrgency,
} from "@/lib/voice-request-parse";
import { createVoiceIo, hasVoiceRecognition } from "@/lib/voice-speech";
import type { BloodGroup, Hospital, UrgencyLevel } from "@/types";

type NearbyHospital = Hospital & { distanceKm: number };
type AskField =
  | "blood"
  | "units"
  | "urgency"
  | "hospital"
  | "name"
  | "phone"
  | "confirm";
type SessionStatus =
  | "starting"
  | "speaking"
  | "listening"
  | "submitting"
  | "done"
  | "blocked"
  | "error";

type VoiceDraft = {
  patientsCount: number;
  bloodGroups: BloodGroup[];
  units: number | null;
  urgency: UrgencyLevel | null;
  hospital: NearbyHospital | null;
  hospitalIndex: number;
  contactName: string;
  phone: string;
  notes: string;
};

const EMPTY_DRAFT: VoiceDraft = {
  patientsCount: 1,
  bloodGroups: [],
  units: null,
  urgency: null,
  hospital: null,
  hospitalIndex: 0,
  contactName: "",
  phone: "",
  notes: "",
};

const GROUP_SAY: Record<Locale, Record<BloodGroup, string>> = {
  en: {
    "A+": "A positive",
    "A-": "A negative",
    "B+": "B positive",
    "B-": "B negative",
    "AB+": "A B positive",
    "AB-": "A B negative",
    "O+": "O positive",
    "O-": "O negative",
  },
  hi: {
    "A+": "ए पॉजिटिव",
    "A-": "ए नेगेटिव",
    "B+": "बी पॉजिटिव",
    "B-": "बी नेगेटिव",
    "AB+": "ए बी पॉजिटिव",
    "AB-": "ए बी नेगेटिव",
    "O+": "ओ पॉजिटिव",
    "O-": "ओ नेगेटिव",
  },
};

const URGENCY_SAY: Record<Locale, Record<UrgencyLevel, string>> = {
  en: {
    critical: "critical — needed immediately",
    urgent: "urgent — within two hours",
    planned: "planned — within twenty four hours",
  },
  hi: {
    critical: "गंभीर — तुरंत चाहिए",
    urgent: "तत्काल — दो घंटे के अंदर",
    planned: "नियोजित — चौबीस घंटे के अंदर",
  },
};

function say(
  locale: Locale,
  path: MessagePath,
  vars?: Record<string, string | number>,
) {
  const [group, key] = path.split(".") as [keyof Messages, string];
  const template =
    (MESSAGES[locale][group] as Record<string, string>)[key] ?? path;
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) =>
    vars[name] !== undefined ? String(vars[name]) : `{${name}}`,
  );
}

function withDistance(hospital: Hospital, coords: { lat: number; lng: number } | null) {
  return {
    ...hospital,
    distanceKm: coords
      ? distanceKm(coords.lat, coords.lng, hospital.lat, hospital.lng)
      : 0,
  };
}

function nextField(draft: VoiceDraft): AskField | null {
  if (draft.bloodGroups.length === 0) return "blood";
  if (draft.units == null) return "units";
  if (!draft.urgency) return "urgency";
  if (!draft.hospital) return "hospital";
  if (!draft.contactName.trim()) return "name";
  if (draft.phone.length !== 10) return "phone";
  return "confirm";
}

function applyTranscript(
  draft: VoiceDraft,
  raw: string,
  field: AskField,
  nearby: NearbyHospital[],
  coords: { lat: number; lng: number } | null,
  suggestedName: string,
): { draft: VoiceDraft; repeat?: boolean; submit?: boolean; restart?: boolean } {
  const intent = parseIntent(raw);
  if (intent === "repeat") return { draft, repeat: true };

  const next = { ...draft, bloodGroups: [...draft.bloodGroups] };

  if (field === "confirm" && intent === "yes") return { draft: next, submit: true };
  if (field === "confirm" && intent === "no") return { draft: next, restart: true };

  if (field !== "phone" && field !== "name") {
    const groups = parseBloodGroups(raw);
    if (groups.length) next.bloodGroups = groups;
    const urgency = parseUrgency(raw);
    if (urgency) next.urgency = urgency;
    const people = parsePatientsCount(raw);
    if (people) next.patientsCount = people;
  }

  if (field === "units" || /(unit|units|यूनिट|बोतल)/i.test(raw)) {
    const units = parseUnits(raw);
    if (units) next.units = units;
  } else if (field !== "phone" && field !== "name" && next.units == null) {
    const units = parseUnits(raw);
    if (units && units <= 10 && !parsePhone(raw)) next.units = units;
  }

  const phone = parsePhone(raw);
  if (phone) next.phone = phone;

  const named =
    parseHospital(raw, nearby) ??
    parseHospital(raw, DEMO_HOSPITALS.map((item) => withDistance(item, coords)));
  if (named) next.hospital = withDistance(named, coords);

  if (next.bloodGroups.length > 1) {
    next.patientsCount = Math.max(next.patientsCount, next.bloodGroups.length);
  }

  if (field === "hospital" && nearby.length > 0) {
    if (intent === "yes") {
      next.hospital = nearby[next.hospitalIndex] ?? nearby[0] ?? next.hospital;
    } else if (intent === "next") {
      next.hospitalIndex = (next.hospitalIndex + 1) % nearby.length;
    } else if (intent === "previous") {
      next.hospitalIndex =
        (next.hospitalIndex - 1 + nearby.length) % nearby.length;
    }
  }

  if (field === "name") {
    if (intent === "yes" && suggestedName) next.contactName = suggestedName;
    else {
      const name = parseName(raw);
      if (name) next.contactName = name;
    }
  } else if (!next.contactName) {
    const name = parseName(raw);
    if (name && field !== "phone") next.contactName = name;
  }

  if (field === "confirm") {
    const groups = parseBloodGroups(raw);
    if (groups.length) next.bloodGroups = groups;
    const urgency = parseUrgency(raw);
    if (urgency) next.urgency = urgency;
    const phoneFix = parsePhone(raw);
    if (phoneFix) next.phone = phoneFix;
  }

  return { draft: next };
}

function summaryOf(draft: VoiceDraft, locale: Locale) {
  const group = draft.bloodGroups.map((item) => GROUP_SAY[locale][item]).join(", ");
  const units = draft.units ?? 1;
  const urgency = draft.urgency ? URGENCY_SAY[locale][draft.urgency] : "";
  const hospital = draft.hospital?.name ?? "";
  if (locale === "hi") {
    return `${group}, ${units} यूनिट, ${urgency}, ${hospital} पर। संपर्क ${draft.contactName}, फ़ोन ${draft.phone}.`;
  }
  return `${group}, ${units} unit${units > 1 ? "s" : ""}, ${urgency}, at ${hospital}. Contact ${draft.contactName}, phone ${draft.phone}.`;
}

export function VoiceRequestAssistant({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const { user, status: authStatus } = useAuth();
  const { locale, setLocale, t } = useLanguage();
  const { coords, status: locStatus, retry: retryLocation } = useLiveLocation();
  const [status, setStatus] = useState<SessionStatus>("starting");
  const [prompt, setPrompt] = useState("");
  const [caption, setCaption] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<VoiceDraft>(EMPTY_DRAFT);
  const [field, setField] = useState<AskField>("blood");

  const ioRef = useRef(createVoiceIo());
  const draftRef = useRef(draft);
  const localeRef = useRef(locale);
  const coordsRef = useRef(coords);
  const nearbyRef = useRef<NearbyHospital[]>([]);
  const locStatusRef = useRef(locStatus);
  const runIdRef = useRef(0);
  const suggestedName =
    (user?.user_metadata?.full_name as string | undefined) ||
    (user?.user_metadata?.name as string | undefined) ||
    "";

  draftRef.current = draft;
  localeRef.current = locale;
  coordsRef.current = coords;
  locStatusRef.current = locStatus;

  const nearby = useMemo<NearbyHospital[]>(() => {
    if (!coords) return [];
    return getNearbyPlaces(DEMO_HOSPITALS, coords.lat, coords.lng);
  }, [coords]);
  nearbyRef.current = nearby;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    if (authStatus === "loading") return;
    if (authStatus !== "authenticated") return;

    const io = createVoiceIo();
    ioRef.current = io;
    const runId = ++runIdRef.current;
    let active = true;

    const still = () => active && runId === runIdRef.current;

    async function ask(next: AskField, current: VoiceDraft) {
      const lang = localeRef.current;
      const hospitals = nearbyRef.current;
      const index = current.hospitalIndex % Math.max(hospitals.length, 1);
      const option = hospitals[index];
      let text = "";
      if (next === "blood") text = say(lang, "voiceAssist.speakBlood");
      if (next === "units") text = say(lang, "voiceAssist.speakUnits");
      if (next === "urgency") text = say(lang, "voiceAssist.speakUrgency");
      if (next === "hospital") {
        text = option
          ? say(lang, "voiceAssist.speakHospital", {
              name: option.name,
              km: formatDistance(option.distanceKm),
            })
          : say(lang, "voiceAssist.speakHospitalNone");
      }
      if (next === "name") {
        text = suggestedName
          ? say(lang, "voiceAssist.speakName", { name: suggestedName })
          : say(lang, "voiceAssist.speakNameAsk");
      }
      if (next === "phone") text = say(lang, "voiceAssist.speakPhone");
      if (next === "confirm") {
        text = say(lang, "voiceAssist.speakConfirm", {
          summary: summaryOf(current, lang),
        });
      }
      setField(next);
      setPrompt(text);
      setStatus("speaking");
      await io.speak(text, lang);
      if (still()) {
        await new Promise((resolve) => window.setTimeout(resolve, 280));
      }
    }

    async function run() {
      setDraft(
        suggestedName
          ? { ...EMPTY_DRAFT, contactName: "" }
          : EMPTY_DRAFT,
      );
      setCaption("");
      setError(null);
      setStatus("starting");

      if (!hasVoiceRecognition() || !hasSpeechSupport()) {
        setStatus("error");
        setError(say(localeRef.current, "voiceAssist.needBrowser"));
        await io.speak(say(localeRef.current, "voiceAssist.speakNeedMic"), localeRef.current);
        return;
      }

      try {
        await navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
          stream.getTracks().forEach((track) => track.stop());
        });
      } catch {
        setStatus("error");
        setError(say(localeRef.current, "voiceAssist.needMic"));
        await io.speak(say(localeRef.current, "voiceAssist.speakNeedMic"), localeRef.current);
        return;
      }

      const existing = await fetchActiveRequestForUser(user?.id);
      if (!still()) return;
      if (existing) {
        setStatus("blocked");
        setPrompt(say(localeRef.current, "voiceAssist.alreadyOpen"));
        await io.speak(say(localeRef.current, "voiceAssist.speakAlready"), localeRef.current);
        return;
      }

      await io.speak(say(localeRef.current, "voiceAssist.speakWelcome"), localeRef.current);
      if (!still()) return;

      const locWait = Date.now() + 7000;
      while (
        still() &&
        !coordsRef.current &&
        locStatusRef.current === "loading" &&
        Date.now() < locWait
      ) {
        await new Promise((resolve) => window.setTimeout(resolve, 250));
      }

      let current: VoiceDraft = {
        ...EMPTY_DRAFT,
        contactName: "",
      };
      let hospitalTries = 0;

      while (still()) {
        const next = nextField(current);
        if (!next) break;
        setDraft(current);
        await ask(next, current);
        if (!still()) return;

        setStatus("listening");
        setCaption("");
        const heard = await io.listen(localeRef.current, (text) => {
          if (still()) setCaption(text);
        });
        if (!still()) return;

        if (!heard.trim()) {
          setCaption("");
          await io.speak(
            say(localeRef.current, "voiceAssist.speakDidntCatch"),
            localeRef.current,
          );
          continue;
        }

        const detected = detectSpeechLocale(heard);
        if (detected && detected !== localeRef.current) setLocale(detected);

        const result = applyTranscript(
          current,
          heard,
          next,
          nearbyRef.current,
          coordsRef.current,
          suggestedName,
        );
        current = result.draft;
        setDraft(current);
        setCaption(heard);

        if (result.repeat) continue;
        if (result.restart) {
          current = { ...EMPTY_DRAFT, contactName: "" };
          hospitalTries = 0;
          setDraft(current);
          await io.speak(
            say(localeRef.current, "voiceAssist.speakWelcome"),
            localeRef.current,
          );
          continue;
        }
        if (result.submit) {
          await publish(current);
          return;
        }

        if (next === "units" && current.units == null) current.units = 1;
        if (next === "hospital" && !current.hospital) {
          hospitalTries += 1;
          const offered =
            nearbyRef.current[current.hospitalIndex] ?? nearbyRef.current[0];
          if (hospitalTries >= 2 && offered) {
            current.hospital = offered;
            setDraft(current);
          }
        }
      }
    }

    async function publish(current: VoiceDraft) {
      const hospital = current.hospital;
      const primary = current.bloodGroups[0];
      if (!hospital || !primary || !current.urgency || current.phone.length !== 10) {
        await io.speak(say(localeRef.current, "voiceAssist.speakSorry"), localeRef.current);
        setStatus("error");
        setError(say(localeRef.current, "voiceAssist.incomplete"));
        return;
      }

      setStatus("submitting");
      setPrompt(say(localeRef.current, "voiceAssist.goingLive"));
      await io.speak(say(localeRef.current, "voiceAssist.speakPublishing"), localeRef.current);
      if (!still()) return;

      try {
        const units = current.units ?? 1;
        const request = await addLiveRequest({
          bloodGroup: primary,
          bloodGroups: current.bloodGroups,
          groupUnits: Object.fromEntries(
            current.bloodGroups.map((group) => [group, units]),
          ) as Partial<Record<BloodGroup, number>>,
          patientsCount: current.patientsCount,
          urgency: current.urgency,
          hospitalId: hospital.id,
          hospitalName: hospital.name,
          hospitalArea: `${hospital.area}, ${hospital.city}`,
          contactName: current.contactName.trim(),
          phone: `+91${current.phone}`,
          units,
          notes: current.notes.trim() || undefined,
          distanceKm: hospital.distanceKm,
        });
        const donors = (await fetchAvailableDonors()).filter(
          (donor) => donor.id !== user?.id,
        );
        const owned = user?.id
          ? { ...request, userId: request.userId ?? user.id }
          : request;
        await startAssignmentForRequest(owned, donors);
        if (!still()) return;
        setStatus("done");
        setPrompt(say(localeRef.current, "voiceAssist.liveBody"));
        await io.speak(say(localeRef.current, "voiceAssist.speakLive"), localeRef.current);
      } catch (err) {
        setStatus("error");
        setError(
          err instanceof Error
            ? err.message
            : say(localeRef.current, "voiceAssist.errPublish"),
        );
        await io.speak(say(localeRef.current, "voiceAssist.speakSorry"), localeRef.current);
      }
    }

    void run();

    return () => {
      active = false;
      io.stop();
    };
    // Conversation starts once per open; locale/location are read from refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user?.id, authStatus]);

  if (!open) return null;

  const filled = [
    draft.bloodGroups.length
      ? { label: t("voiceAssist.group"), value: draft.bloodGroups.join(" · ") }
      : null,
    draft.units
      ? { label: t("voiceAssist.units"), value: String(draft.units) }
      : null,
    draft.urgency
      ? {
          label: t("voiceAssist.urgency"),
          value:
            draft.urgency === "critical"
              ? t("urgency.critical")
              : draft.urgency === "urgent"
                ? t("urgency.urgent")
                : t("urgency.planned"),
        }
      : null,
    draft.hospital
      ? { label: t("voiceAssist.hospital"), value: draft.hospital.name }
      : null,
    draft.contactName
      ? { label: t("voiceAssist.name"), value: draft.contactName }
      : null,
    draft.phone
      ? { label: t("voiceAssist.phone"), value: `+91 ${draft.phone}` }
      : null,
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <div className="fixed inset-0 z-[95] flex items-end justify-center sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-[#14080c]/80 backdrop-blur-[3px]"
        aria-label={t("voiceAssist.close")}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="voice-assist-title"
        className="relative flex max-h-[100svh] w-full max-w-lg flex-col overflow-hidden rounded-t-[1.75rem] border border-white/15 bg-gradient-to-b from-[#3a121c] via-[#1c0d14] to-[#12080c] shadow-[0_30px_80px_-16px_rgba(0,0,0,0.7)] sm:max-h-[90svh] sm:rounded-[1.75rem]"
      >
        <header className="flex items-start justify-between gap-3 px-5 pb-2 pt-5">
          <div className="min-w-0">
            <p className="text-[0.65rem] font-black uppercase tracking-[0.2em] text-[#ff8a9a]">
              {t("voiceAssist.kicker")}
            </p>
            <h2
              id="voice-assist-title"
              className="mt-1 font-display text-2xl font-extrabold tracking-tight text-white"
            >
              {t("voiceAssist.title")}
            </h2>
            <p className="mt-1 text-sm font-semibold text-white/65">
              {t("voiceAssist.body")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-white/70 hover:bg-white/10 hover:text-white"
            aria-label={t("voiceAssist.close")}
          >
            <X className="size-5" aria-hidden />
          </button>
        </header>

        <div className="flex gap-2 px-5">
          {(["en", "hi"] as const).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setLocale(id)}
              className={cn(
                "h-10 flex-1 rounded-xl text-sm font-black transition",
                locale === id
                  ? "bg-white text-ink"
                  : "bg-white/10 text-white/80 hover:bg-white/16",
              )}
            >
              {id === "en" ? "English" : "हिन्दी"}
            </button>
          ))}
        </div>

        <div className="flex flex-1 flex-col items-center overflow-y-auto px-5 py-6">
          <div className="relative flex size-36 items-center justify-center">
            {status === "listening" || status === "speaking" ? (
              <>
                <span className="voice-ring absolute inset-0 rounded-full bg-[#ff2d4a]/35" />
                <span className="voice-ring absolute inset-2 rounded-full bg-[#ff2d4a]/25 [animation-delay:250ms]" />
              </>
            ) : null}
            <button
              type="button"
              onClick={() => {
                if (status === "speaking") {
                  window.speechSynthesis?.cancel();
                } else if (status === "listening") {
                  ioRef.current.stopListening();
                }
              }}
              className={cn(
                "relative flex size-24 items-center justify-center rounded-full text-white shadow-[0_18px_40px_-12px_rgba(255,45,74,0.8)] transition",
                status === "listening"
                  ? "bg-gradient-to-br from-[#ff4d6d] to-[#8e0c22]"
                  : status === "speaking"
                    ? "bg-gradient-to-br from-teal to-teal-deep"
                    : "bg-gradient-to-br from-[#ff4d6d] to-[#8e0c22]",
              )}
              aria-label={t("voiceAssist.tapSpeak")}
            >
              {status === "submitting" || status === "starting" ? (
                <Loader2 className="size-9 animate-spin" aria-hidden />
              ) : (
                <Mic className="size-9" aria-hidden />
              )}
            </button>
          </div>

          <p className="mt-4 text-xs font-black uppercase tracking-[0.18em] text-[#ff8a9a]">
            {status === "listening"
              ? t("voiceAssist.listening")
              : status === "speaking"
                ? t("voiceAssist.speaking")
                : status === "submitting"
                  ? t("voiceAssist.goingLive")
                  : status === "done"
                    ? t("voiceAssist.live")
                    : status === "blocked"
                      ? t("voiceAssist.alreadyOpenTitle")
                      : t("voiceAssist.ready")}
            {status === "listening" || status === "speaking"
              ? ` · ${
                  field === "blood"
                    ? t("voiceAssist.group")
                    : field === "units"
                      ? t("voiceAssist.units")
                      : field === "urgency"
                        ? t("voiceAssist.urgency")
                        : field === "hospital"
                          ? t("voiceAssist.hospital")
                          : field === "name"
                            ? t("voiceAssist.name")
                            : field === "phone"
                              ? t("voiceAssist.phone")
                              : t("voiceAssist.confirm")
                }`
              : ""}
          </p>
          <p className="mt-2 max-w-sm text-center font-display text-xl font-extrabold leading-snug tracking-tight text-white">
            {prompt || t("voiceAssist.body")}
          </p>
          {caption ? (
            <p className="mt-3 max-w-sm text-center text-sm font-semibold text-white/70">
              “{caption}”
            </p>
          ) : null}
          {error ? (
            <p
              role="alert"
              className="mt-3 max-w-sm text-center text-sm font-bold text-[#ffb4be]"
            >
              {error}
            </p>
          ) : null}

          {locStatus === "denied" || locStatus === "unavailable" ? (
            <button
              type="button"
              onClick={retryLocation}
              className="mt-3 text-xs font-black uppercase tracking-wider text-[#ff8a9a] hover:underline"
            >
              {t("request.tryAgain")} · {t("voiceAssist.needLocation")}
            </button>
          ) : null}

          {filled.length > 0 ? (
            <ul className="mt-5 grid w-full gap-2">
              {filled.map((item) => (
                <li
                  key={item.label}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-white/8 px-3.5 py-2.5 ring-1 ring-white/10"
                >
                  <span className="text-[0.65rem] font-black uppercase tracking-[0.14em] text-white/50">
                    {item.label}
                  </span>
                  <span className="text-right text-sm font-bold text-white">
                    {item.value}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <footer className="flex flex-col gap-2 border-t border-white/10 px-5 py-4 sm:flex-row">
          {status === "done" || status === "blocked" || status === "error" ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                router.push("/request-help");
              }}
              className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#c91833] to-[#8a1024] text-sm font-black uppercase tracking-wide text-white"
            >
              {status === "error" ? t("hero.requestTitle") : t("voiceAssist.openRequest")}
              <ArrowUpRight className="size-4" aria-hidden />
            </button>
          ) : (
            <p className="flex flex-1 items-center justify-center gap-2 text-center text-xs font-semibold text-white/55">
              <HospitalIcon className="size-3.5" aria-hidden />
              {t("voiceAssist.hint")}
              <Phone className="size-3.5" aria-hidden />
            </p>
          )}
        </footer>
      </div>
    </div>
  );
}
