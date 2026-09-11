import type { Locale } from "@/lib/i18n/messages";

function SpeechRec(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

export function hasVoiceRecognition() {
  return Boolean(SpeechRec());
}

function pickVoice(lang: Locale) {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  const prefix = lang === "hi" ? "hi" : "en";
  const indian = voices.find((voice) =>
    voice.lang.toLowerCase().startsWith(`${prefix}-in`),
  );
  if (indian) return indian;
  return voices.find((voice) => voice.lang.toLowerCase().startsWith(prefix)) ?? null;
}

/** Warm voices in the background — never block the user. */
function warmVoices() {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.getVoices();
  const onChange = () => {
    window.speechSynthesis.getVoices();
  };
  window.speechSynthesis.addEventListener("voiceschanged", onChange, {
    once: true,
  });
}

if (typeof window !== "undefined") {
  warmVoices();
}

export type CaptionHandler = (text: string, interim: boolean) => void;

export function createVoiceIo() {
  let aborted = false;
  let recognition: SpeechRecognition | null = null;
  let activeUtterance: SpeechSynthesisUtterance | null = null;
  let settleSpeak: (() => void) | null = null;
  let micWarm: Promise<boolean> | null = null;

  function stopListening() {
    try {
      recognition?.stop();
    } catch {
      /* ignore */
    }
  }

  function stopSpeaking() {
    settleSpeak?.();
    settleSpeak = null;
    activeUtterance = null;
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
  }

  function stop() {
    aborted = true;
    stopSpeaking();
    try {
      recognition?.abort();
    } catch {
      /* ignore */
    }
    recognition = null;
  }

  function reset() {
    aborted = false;
  }

  /** Request mic permission early so the first listen is instant. */
  function warmMic() {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      return Promise.resolve(false);
    }
    if (!micWarm) {
      micWarm = navigator.mediaDevices
        .getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
          },
        })
        .then((stream) => {
          stream.getTracks().forEach((track) => track.stop());
          return true;
        })
        .catch(() => false);
    }
    return micWarm;
  }

  async function speak(text: string, lang: Locale) {
    if (aborted || !text.trim()) return;
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    warmVoices();
    stopSpeaking();
    stopListening();

    await new Promise<void>((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang === "hi" ? "hi-IN" : "en-IN";
      utterance.rate = lang === "hi" ? 1.05 : 1.08;
      utterance.pitch = 1;
      const voice = pickVoice(lang);
      if (voice) utterance.voice = voice;
      activeUtterance = utterance;

      const done = () => {
        if (activeUtterance === utterance) activeUtterance = null;
        if (settleSpeak === done) settleSpeak = null;
        resolve();
      };
      settleSpeak = done;
      utterance.onend = done;
      utterance.onerror = done;
      try {
        window.speechSynthesis.speak(utterance);
      } catch {
        done();
      }
    });
  }

  async function listen(
    lang: Locale,
    onCaption: CaptionHandler,
    options?: { minWords?: number; silenceMs?: number },
  ): Promise<string> {
    const Ctor = SpeechRec();
    if (!Ctor || aborted) return "";

    stopSpeaking();
    await warmMic();

    const minWords = options?.minWords ?? 4;
    const silenceMs = options?.silenceMs ?? 900;

    return new Promise((resolve) => {
      let settled = false;
      let finals = "";
      let interim = "";
      let silenceTimer: number | null = null;
      const rec = new Ctor();
      recognition = rec;
      rec.lang = lang === "hi" ? "hi-IN" : "en-IN";
      // One-shot recognition finalizes much faster than continuous mode.
      rec.continuous = false;
      rec.interimResults = true;
      rec.maxAlternatives = 1;

      const clearSilence = () => {
        if (silenceTimer != null) {
          window.clearTimeout(silenceTimer);
          silenceTimer = null;
        }
      };

      const finish = (value: string) => {
        if (settled) return;
        settled = true;
        clearSilence();
        window.clearTimeout(limit);
        try {
          rec.stop();
        } catch {
          /* ignore */
        }
        if (recognition === rec) recognition = null;
        resolve(value.trim());
      };

      const bumpSilence = () => {
        clearSilence();
        const heard = `${finals} ${interim}`.trim();
        if (!heard) return;
        silenceTimer = window.setTimeout(() => {
          finish(finals || interim);
        }, silenceMs);
      };

      const limit = window.setTimeout(() => finish(finals || interim), 10_000);

      rec.onresult = (event) => {
        if (aborted) return finish("");
        interim = "";
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const result = event.results[i];
          const alt = result[0]?.transcript ?? "";
          if (result.isFinal) {
            finals = `${finals} ${alt}`.trim();
            onCaption(finals, false);
          } else {
            interim += alt;
          }
        }
        if (interim) onCaption(`${finals} ${interim}`.trim(), true);
        bumpSilence();
        if (finals.split(/\s+/).filter(Boolean).length >= minWords) {
          finish(finals);
        }
      };

      rec.onerror = (event) => {
        if (event.error === "no-speech" || event.error === "aborted") {
          finish(finals || interim);
          return;
        }
        finish(finals || interim);
      };

      rec.onend = () => {
        finish(finals || interim);
      };

      try {
        rec.start();
      } catch {
        finish("");
      }
    });
  }

  return {
    speak,
    listen,
    stop,
    stopListening,
    stopSpeaking,
    reset,
    warmMic,
  };
}
