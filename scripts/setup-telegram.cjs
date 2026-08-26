/**
 * One-time helper: resolve bot username and save to .env.local
 * Run: node scripts/setup-telegram.cjs
 */
const fs = require("fs");
const path = require("path");

function readEnv(file) {
  const raw = fs.readFileSync(file, "utf8");
  const out = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const i = trimmed.indexOf("=");
    if (i < 0) continue;
    out[trimmed.slice(0, i)] = trimmed.slice(i + 1);
  }
  return out;
}

async function main() {
  const envPath = path.join(process.cwd(), ".env.local");
  const env = readEnv(envPath);
  const token = env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error("Missing TELEGRAM_BOT_TOKEN in .env.local");
    process.exit(1);
  }

  const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
  const data = await res.json();
  if (!data.ok || !data.result?.username) {
    console.error("getMe failed:", data.description || data);
    process.exit(1);
  }

  const username = data.result.username;
  let text = fs.readFileSync(envPath, "utf8");
  if (/^NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=/m.test(text)) {
    text = text.replace(
      /^NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=.*$/m,
      `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=${username}`,
    );
  } else {
    text += `\nNEXT_PUBLIC_TELEGRAM_BOT_USERNAME=${username}\n`;
  }
  fs.writeFileSync(envPath, text);
  console.log(`Bot username saved: @${username}`);
  console.log("Run supabase/donor-telegram.sql in Supabase SQL Editor if you have not yet.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
