import type { BloodGroup, Hospital, UrgencyLevel } from "@/types";

export type VoiceIntent =
  | "yes"
  | "no"
  | "next"
  | "previous"
  | "repeat"
  | "unknown";

const HI_DIGITS: Record<string, string> = {
  शून्य: "0",
  सिफर: "0",
  जीरो: "0",
  एक: "1",
  दो: "2",
  तीन: "3",
  चार: "4",
  पाँच: "5",
  पांच: "5",
  पाच: "5",
  छह: "6",
  छः: "6",
  छे: "6",
  सात: "7",
  आठ: "8",
  नौ: "9",
  नव: "9",
};

const EN_DIGITS: Record<string, string> = {
  zero: "0",
  oh: "0",
  o: "0",
  one: "1",
  two: "2",
  three: "3",
  four: "4",
  five: "5",
  six: "6",
  seven: "7",
  eight: "8",
  nine: "9",
};

const HI_NUMBERS: Record<string, number> = {
  एक: 1,
  दो: 2,
  तीन: 3,
  चार: 4,
  पाँच: 5,
  पांच: 5,
  छह: 6,
  छः: 6,
  सात: 7,
  आठ: 8,
  नौ: 9,
  दस: 10,
  ग्यारह: 11,
  बारह: 12,
  तेरह: 13,
  चौदह: 14,
  पंद्रह: 15,
  पन्द्रह: 15,
  सोलह: 16,
  सत्रह: 17,
  अठारह: 18,
  उन्नीस: 19,
};

const EN_NUMBERS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
};

const HOSPITAL_ALIASES: Record<string, string[]> = {
  h1: ["aiims", "aims", "एम्स", "एम्स ट्रॉमा", "trauma"],
  h2: ["apollo", "अपोलो"],
  h3: ["max saket", "max super", "मैक्स", "saket"],
  h4: ["fortis", "escorts", "फोर्टिस"],
  h5: ["ganga ram", "gangaram", "गंगा राम", "गंगाराम"],
  h6: ["medanta", "मेदांता", "mediciti", "gurugram", "gurgaon"],
  h7: ["blk", "blk max", "pusa"],
  h8: ["safdarjung", "safdarjang", "सफदरजंग", "सफदरजंग"],
};

export function normalizeSpeech(raw: string) {
  return raw
    .toLowerCase()
    .replace(/[।.?!,:;]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function detectSpeechLocale(text: string): "en" | "hi" | null {
  const hi = (text.match(/[\u0900-\u097F]/g) ?? []).length;
  const en = (text.match(/[a-zA-Z]/g) ?? []).length;
  if (hi >= 3 && hi >= en) return "hi";
  if (en >= 8 && en > hi * 2) return "en";
  return null;
}

export function parseIntent(raw: string): VoiceIntent {
  const text = normalizeSpeech(raw);
  if (
    /\b(yes|yeah|yep|ok|okay|correct|confirm|right|sure|go live|submit|do it)\b/.test(
      text,
    ) ||
    /(हाँ|हां|जी|जी हाँ|जी हां|ठीक|सही|बिल्कुल|लाइव|कर दो|कर दें|हां करो)/.test(text)
  ) {
    return "yes";
  }
  if (
    /\b(no|nope|wrong|cancel|stop|change|restart)\b/.test(text) ||
    /(नहीं|नही|ना|गलत|रद्द|बदलो|फिर से)/.test(text)
  ) {
    return "no";
  }
  if (
    /\b(next|another|other|skip)\b/.test(text) ||
    /(अगला|दूसरा|और|कोई और)/.test(text)
  ) {
    return "next";
  }
  if (
    /\b(previous|back|last one)\b/.test(text) ||
    /(पिछला|वापस)/.test(text)
  ) {
    return "previous";
  }
  if (
    /\b(repeat|again|pardon|what)\b/.test(text) ||
    /(दोहराओ|फिर बोलो|सुनाई नहीं|क्या कहा)/.test(text)
  ) {
    return "repeat";
  }
  return "unknown";
}

export function parseBloodGroups(raw: string): BloodGroup[] {
  const text = ` ${normalizeSpeech(raw)
    .replace(/positive|plus|पॉजिटिव|पोजिटिव|पॉसिटिव|प्लस|\+/g, " plus ")
    .replace(/negative|minus|negetive|नेगेटिव|नेगेटिव|माइनस|−|–/g, " minus ")
    .replace(/एबी/g, " ab ")
    .replace(/ए\s*बी/g, " ab ")
    .replace(/\ba\s*b\b/g, " ab ")
    .replace(/\boh\b|\bo\b|\bzero\b|ज़ीरो|जीरो/g, " o ")
    .replace(/(^| )ओ( |$)/g, " o ")
    .replace(/\bbe+e?\b|\bbea\b/g, " b ")
    .replace(/(^| )बी( |$)/g, " b ")
    .replace(/\bay\b|\baa\b/g, " a ")
    .replace(/(^| )ए( |$)/g, " a ")} `

  const found: BloodGroup[] = [];
  const add = (group: BloodGroup) => {
    if (!found.includes(group)) found.push(group);
  };

  const patterns: Array<[RegExp, BloodGroup]> = [
    [/\bab\s*plus\b|\bab\s*\+/, "AB+"],
    [/\bab\s*minus\b|\bab\s*-/, "AB-"],
    [/\ba\s*plus\b|\ba\s*\+/, "A+"],
    [/\ba\s*minus\b|\ba\s*-/, "A-"],
    [/\bb\s*plus\b|\bb\s*\+/, "B+"],
    [/\bb\s*minus\b|\bb\s*-/, "B-"],
    [/\bo\s*plus\b|\bo\s*\+/, "O+"],
    [/\bo\s*minus\b|\bo\s*-/, "O-"],
  ];

  for (const [pattern, group] of patterns) {
    if (pattern.test(text)) add(group);
  }

  const compact = raw.toUpperCase().replace(/\s+/g, "");
  for (const group of ["AB+", "AB-", "A+", "A-", "B+", "B-", "O+", "O-"] as BloodGroup[]) {
    if (compact.includes(group)) add(group);
  }

  return found;
}

export function parseUrgency(raw: string): UrgencyLevel | null {
  const text = normalizeSpeech(raw);
  if (
    /\b(critical|emergency|dying|immediately|asap|right now|very urgent)\b/.test(
      text,
    ) ||
    /(गंभीर|इमरजेंसी|इमरजेंसी|बहुत जल्दी|अभी चाहिए|जान|एसओएस|sos|तुरंत चाहिए)/.test(
      text,
    )
  ) {
    return "critical";
  }
  if (
    /\b(planned|schedule|surgery|tomorrow|later|24 hour|twenty four)\b/.test(
      text,
    ) ||
    /(नियोजित|सर्जरी|कल|बाद में|चौबीस|24 घंटे)/.test(text)
  ) {
    return "planned";
  }
  if (
    /\b(urgent|soon|today|two hour|2 hour)\b/.test(text) ||
    /(तत्काल|जल्दी|आज|दो घंटे|आवश्यक)/.test(text)
  ) {
    return "urgent";
  }
  return null;
}

function numberFromToken(token: string): number | null {
  if (/^\d+$/.test(token)) return Number(token);
  if (token in EN_NUMBERS) return EN_NUMBERS[token];
  if (token in HI_NUMBERS) return HI_NUMBERS[token];
  return null;
}

export function parseCount(raw: string, min: number, max: number): number | null {
  const text = normalizeSpeech(raw);
  const tokens = text.split(" ");
  for (const token of tokens) {
    const n = numberFromToken(token);
    if (n != null && n >= min && n <= max) return n;
  }
  const digit = text.match(/\b([1-9]|1\d)\b/);
  if (digit) {
    const n = Number(digit[1]);
    if (n >= min && n <= max) return n;
  }
  return null;
}

export function parsePatientsCount(raw: string): number | null {
  const text = normalizeSpeech(raw);
  if (
    /\b(one person|single|just me|only me|myself|one patient)\b/.test(text) ||
    /(एक व्यक्ति|एक मरीज|एक मरीज़|अकेला|सिर्फ एक|केवल एक)/.test(text)
  ) {
    return 1;
  }
  if (/(कई लोग|multiple|more than one|कई)/.test(text)) {
    return parseCount(text, 2, 19) ?? 2;
  }
  const people = parseCount(text, 1, 19);
  if (
    people &&
    /(people|person|patient|persons|patients|लोग|व्यक्ति|मरीज|मरीज़)/.test(text)
  ) {
    return people;
  }
  return null;
}

export function parseUnits(raw: string): number | null {
  const text = normalizeSpeech(raw);
  const n = parseCount(text, 1, 10);
  if (!n) return null;
  if (
    /(unit|units|bottle|packet|pint|यूनिट|बोतल|पैकेट)/.test(text) ||
    n <= 10
  ) {
    return n;
  }
  return n;
}

export function indianMobileDigits(value: string) {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("91") && digits.length > 10) digits = digits.slice(2);
  if (digits.startsWith("0") && digits.length === 11) digits = digits.slice(1);
  return digits.slice(0, 10);
}

export function parsePhone(raw: string): string | null {
  const text = normalizeSpeech(raw);
  const tokens = text.split(" ");
  let built = "";
  for (const token of tokens) {
    if (/^\d+$/.test(token)) {
      built += token;
      continue;
    }
    if (token in EN_DIGITS) {
      built += EN_DIGITS[token];
      continue;
    }
    if (token in HI_DIGITS) {
      built += HI_DIGITS[token];
      continue;
    }
    if (built.length > 0 && built.length < 10) {
      /* keep collecting */
    }
  }
  const fromWords = indianMobileDigits(built);
  if (fromWords.length === 10) return fromWords;

  const fromDigits = indianMobileDigits(raw);
  return fromDigits.length === 10 ? fromDigits : null;
}

export function parseName(raw: string): string | null {
  const intent = parseIntent(raw);
  if (intent === "yes" || intent === "no" || intent === "repeat") return null;
  if (parseBloodGroups(raw).length) return null;
  if (parsePhone(raw)) return null;

  let text = raw
    .replace(
      /^(my name is|myself|i am|this is|call me|मेरा नाम है|मेरा नाम|नाम है|मैं हूँ|मैं)/i,
      "",
    )
    .replace(/[।.?!]/g, " ")
    .trim();
  text = text.replace(/\s+/g, " ");
  if (text.length < 2 || text.length > 48) return null;
  if (/^\d+$/.test(text)) return null;
  return text
    .split(" ")
    .map((part) =>
      /^[\u0900-\u097F]+$/.test(part)
        ? part
        : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase(),
    )
    .join(" ");
}

export function parseHospital<T extends Hospital>(
  raw: string,
  hospitals: T[],
): T | null {
  const text = normalizeSpeech(raw);
  if (!text || !hospitals.length) return null;

  for (const hospital of hospitals) {
    const aliases = HOSPITAL_ALIASES[hospital.id] ?? [];
    const hay = normalizeSpeech(
      `${hospital.name} ${hospital.area} ${hospital.city} ${aliases.join(" ")}`,
    );
    if (aliases.some((alias) => text.includes(alias))) return hospital;
    const nameBits = normalizeSpeech(hospital.name)
      .replace(/\b(hospital|hospitals|centre|center|super|speciality|institute|the)\b/g, "")
      .split(" ")
      .filter((bit) => bit.length > 3);
    if (nameBits.some((bit) => text.includes(bit))) return hospital;
    if (text.includes(normalizeSpeech(hospital.area))) return hospital;
    if (hay.includes(text) && text.length > 4) return hospital;
  }
  return null;
}

export function hasSpeechSupport() {
  if (typeof window === "undefined") return false;
  return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}
