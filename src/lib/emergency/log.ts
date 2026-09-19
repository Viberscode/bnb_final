type LogPayload = Record<string, unknown>;

function redactPhone(value?: string | null) {
  if (!value) return undefined;
  const digits = value.replace(/\D/g, "");
  if (digits.length < 4) return "***";
  return `***${digits.slice(-4)}`;
}

export function emergencyLog(event: string, payload: LogPayload = {}) {
  const safe = { ...payload };
  if (typeof safe.phone === "string") safe.phone = redactPhone(safe.phone);
  if (typeof safe.to === "string") safe.to = redactPhone(safe.to);
  console.info(
    JSON.stringify({
      scope: "emergency_escalation",
      event,
      at: new Date().toISOString(),
      ...safe,
    }),
  );
}
