function intEnv(name: string, fallback: number) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export const emergencyConfig = {
  maxDonorsToCall: intEnv("MAX_EMERGENCY_CALL_DONORS", 5),
  maxAttemptsPerDonor: intEnv("MAX_CALL_ATTEMPTS_PER_DONOR", 2),
  callTimeoutSeconds: intEnv("EMERGENCY_CALL_TIMEOUT_SECONDS", 45),
  delayBetweenCallsSeconds: intEnv("DELAY_BETWEEN_EMERGENCY_CALLS_SECONDS", 20),
  processSecret: process.env.EMERGENCY_PROCESS_SECRET ?? "",
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID ?? "",
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN ?? "",
  twilioPhoneNumber: process.env.TWILIO_PHONE_NUMBER ?? "",
  twilioSmsFrom: process.env.TWILIO_PHONE_NUMBER ?? process.env.TWILIO_SMS_FROM ?? "",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "",
};

export function isTwilioVoiceConfigured() {
  return Boolean(
    emergencyConfig.twilioAccountSid &&
      emergencyConfig.twilioAuthToken &&
      emergencyConfig.twilioPhoneNumber,
  );
}

export function isTwilioSmsConfigured() {
  return Boolean(
    emergencyConfig.twilioAccountSid &&
      emergencyConfig.twilioAuthToken &&
      emergencyConfig.twilioSmsFrom,
  );
}
