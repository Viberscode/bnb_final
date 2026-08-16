"use client";

import { cn } from "@/lib/utils";

function digitsOnly(value?: string) {
  return (value ?? "").replace(/\D/g, "");
}

export function formatPhoneDisplay(phone?: string) {
  const digits = digitsOnly(phone);
  if (digits.length >= 10) {
    const last10 = digits.slice(-10);
    return `${last10.slice(0, 5)} ${last10.slice(5)}`;
  }
  if (phone?.trim()) return phone.trim();
  return "98765 43210";
}

export function ContactPhone({
  phone,
  revealed,
  className,
  asLink = true,
}: {
  phone?: string;
  revealed: boolean;
  className?: string;
  asLink?: boolean;
}) {
  const display = formatPhoneDisplay(phone);
  const canCall = revealed && Boolean(digitsOnly(phone));

  if (canCall && asLink) {
    return (
      <a
        href={`tel:${digitsOnly(phone)}`}
        className={cn(
          "font-semibold text-ink underline-offset-2 hover:underline",
          className,
        )}
      >
        {display}
      </a>
    );
  }

  if (revealed) {
    return <span className={cn("font-semibold text-ink", className)}>{display}</span>;
  }

  return (
    <span
      className={cn(
        "inline-block select-none font-semibold tracking-wide text-ink blur-[6px]",
        className,
      )}
      aria-hidden
    >
      {display}
    </span>
  );
}
