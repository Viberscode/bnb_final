export async function notifyDonorsRequestIsLive(requestId: string) {
  try {
    await fetch("/api/telegram/broadcast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId }),
    });
  } catch {
    /* request is still live even if Telegram notify fails */
  }
}
