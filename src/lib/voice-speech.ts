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

function waitForVoices() {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    return Promise.resolve();
  }
  if (window.speechSynthesis.getVoices().length > 0) return Promise.resolve();
  return new Promise<void>((resolve) => {
    const done = () => {
      window.speechSynthesis.removeEventListener("voiceschanged", done);
      resolve();
    };
    window.speechSynthesis.addEventListener("voiceschanged", done);
    window.setTimeout(done, 800);
  });
}

export type CaptionHandler = (text: string, interim: boolean) => void;

export function createVoiceIo() {
  let aborted = false;
  let recognition: SpeechRecognition | null = null;
  let activeUtterance: SpeechSynthesisUtterance | null = null;

  function stopListening() {
    try {
      recognition?.stop();
    } catch {
      /* ignore */
    }
  }

  function stop() {
    aborted = true;
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    try {
      recognition?.abort();
    } catch {
      /* ignore */
    }
    recognition = null;
    activeUtterance = null;
  }

  function reset() {
    aborted = false;
  }

  async function speak(text: string, lang: Locale) {
    if (aborted || !text.trim()) return;
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    await waitForVoices();
    if (aborted) return;

    window.speechSynthesis.cancel();
    await new Promise((resolve) => window.setTimeout(resolve, 60));
    if (aborted) return;

    await new Promise<void>((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang === "hi" ? "hi-IN" : "en-IN";
      utterance.rate = lang === "hi" ? 0.92 : 0.96;
      utterance.pitch = 1;
      const voice = pickVoice(lang);
      if (voice) utterance.voice = voice;
      activeUtterance = utterance;
      utterance.onend = () => {
        if (activeUtterance === utterance) activeUtterance = null;
        resolve();
      };
      utterance.onerror = () => {
        if (activeUtterance === utterance) activeUtterance = null;
        resolve();
      };
      window.speechSynthesis.speak(utterance);
    });
  }

  async function listen(lang: Locale, onCaption: CaptionHandler): Promise<string> {
    const Ctor = SpeechRec();
    if (!Ctor || aborted) return "";

    return new Promise((resolve) => {
      let settled = false;
      let finals = "";
      let idleRestarts = 0;
      const rec = new Ctor();
      recognition = rec;
      rec.lang = lang === "hi" ? "hi-IN" : "en-IN";
      rec.continuous = true;
      rec.interimResults = true;
      rec.maxAlternatives = 3;

      const finish = (value: string) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(limit);
        try {
          rec.stop();
        } catch {
          /* ignore */
        }
        if (recognition === rec) recognition = null;
        resolve(value.trim());
      };

      const limit = window.setTimeout(() => finish(finals), 18000);

      rec.onresult = (event) => {
        if (aborted) return finish("");
        let interim = "";
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
        if (finals.split(" ").length >= 12) finish(finals);
      };

      rec.onerror = (event) => {
        if (event.error === "no-speech" || event.error === "aborted") return;
        finish(finals);
      };

      rec.onend = () => {
        if (settled || aborted) {
          finish(finals);
          return;
        }
        if (finals.trim()) {
          finish(finals);
          return;
        }
        idleRestarts += 1;
        if (idleRestarts > 4) {
          finish("");
          return;
        }
        try {
          rec.start();
        } catch {
          finish("");
        }
      };

      try {
        rec.start();
      } catch {
        finish("");
      }
    });
  }

  return { speak, listen, stop, stopListening, reset };
}
