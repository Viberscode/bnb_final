export async function notifyDonorsRequestIsLive(requestId: string) {
  try {
    await fetch("/api/whatsapp/broadcast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId }),
    });
  } catch {
    /* request is still live even if WhatsApp notify fails */
  }
}
