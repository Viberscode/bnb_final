"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  FileUp,
  Loader2,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import { MockKycPanel } from "@/components/donor/mock-kyc-panel";
import { useAuth } from "@/components/auth/auth-provider";
import { useLanguage } from "@/components/i18n/language-provider";
import { fetchNgoProfile, fileToDataUrl, saveNgoProfile } from "@/lib/ngo-profile";
import { cn } from "@/lib/utils";

const MOCK_OTP = "123456";

type PanelTone = "crimson" | "amber" | "teal" | "slate" | "indigo" | "sky";

function indianMobileDigits(value: string) {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("91") && digits.length > 10) digits = digits.slice(2);
  if (digits.startsWith("0") && digits.length === 11) digits = digits.slice(1);
  return digits.slice(0, 10);
}

function StepPanel({
  tone,
  step,
  stepLabel,
  title,
  icon: Icon,
  delayMs,
  children,
}: {
  tone: PanelTone;
  step: string;
  stepLabel: string;
  title: string;
  icon: typeof Building2;
  delayMs: number;
  children: ReactNode;
}) {
  return (
    <section
      className="request-step-panel p-4 sm:p-5"
      data-tone={tone === "sky" ? "slate" : tone}
      style={{ animationDelay: `${delayMs}ms, ${delayMs}ms` }}
    >
      <header className="flex items-center gap-3">
        <span
          className={cn(
            "inline-flex size-10 shrink-0 items-center justify-center rounded-xl text-white shadow-[0_10px_22px_-10px_rgba(0,0,0,0.45)] sm:size-11",
            tone === "crimson" &&
              "bg-gradient-to-br from-[#ff4d6d] to-[#8e0c22]",
            tone === "amber" &&
              "bg-gradient-to-br from-amber-400 to-orange-600",
            tone === "teal" && "bg-gradient-to-br from-teal to-teal-deep",
            tone === "slate" &&
              "bg-gradient-to-br from-slate-500 to-slate-800",
            tone === "indigo" &&
              "bg-gradient-to-br from-indigo-500 to-violet-700",
            tone === "sky" &&
              "bg-gradient-to-br from-sky-500 to-blue-800",
          )}
        >
          <Icon className="size-4 sm:size-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p
            className={cn(
              "text-[0.65rem] font-bold uppercase tracking-[0.18em]",
              tone === "crimson" && "text-crimson",
              tone === "amber" && "text-amber-700",
              tone === "teal" && "text-teal-deep",
              tone === "slate" && "text-slate-600",
              tone === "indigo" && "text-indigo-700",
              tone === "sky" && "text-sky-800",
            )}
          >
            {stepLabel} {step}
          </p>
          <h2 className="mt-0.5 font-display text-xl font-extrabold tracking-[-0.03em] text-ink sm:text-2xl">
            {title}
          </h2>
        </div>
      </header>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function BecomeNgoForm({
  onSaved,
}: {
  onSaved?: (name: string) => void;
}) {
  const router = useRouter();
  const { user, status } = useAuth();
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const [registrationNo, setRegistrationNo] = useState("");
  const [certificateName, setCertificateName] = useState("");
  const [certificateUrl, setCertificateUrl] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [authorizedPerson, setAuthorizedPerson] = useState("");
  const [kycVerified, setKycVerified] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEdit, setIsEdit] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      const existing = await fetchNgoProfile(user?.id);
      if (!existing || !active) return;
      setIsEdit(true);
      setName(existing.name);
      setRegistrationNo(existing.registrationNo);
      setCertificateName(existing.certificateName ?? "");
      setCertificateUrl(existing.certificateUrl ?? "");
      setAddress(existing.address);
      setPhone(existing.phone.replace(/^\+91/, ""));
      setPhoneVerified(true);
      setOtpSent(true);
      setAuthorizedPerson(existing.authorizedPerson);
      setKycVerified(true);
    })();
    return () => {
      active = false;
    };
  }, [user?.id]);

  async function handleCertificate(file: File | undefined) {
    if (!file) return;
    setCertificateName(file.name);
    setCertificateUrl(await fileToDataUrl(file));
  }

  function sendOtp() {
    const mobile = indianMobileDigits(phone);
    if (mobile.length !== 10) {
      setError(t("ngo.errPhone"));
      return;
    }
    setError(null);
    setSendingOtp(true);
    window.setTimeout(() => {
      setSendingOtp(false);
      setOtpSent(true);
      setPhoneVerified(false);
      setOtp("");
    }, 600);
  }

  function verifyOtp() {
    if (otp.trim() !== MOCK_OTP) {
      setError(t("ngo.errOtp"));
      return;
    }
    setError(null);
    setPhoneVerified(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (status !== "authenticated") {
      setError(t("ngo.errSignIn"));
      return;
    }
    if (!name.trim()) {
      setError(t("ngo.errName"));
      return;
    }
    if (!registrationNo.trim()) {
      setError(t("ngo.errReg"));
      return;
    }
    if (!certificateUrl) {
      setError(t("ngo.errCert"));
      return;
    }
    if (!address.trim()) {
      setError(t("ngo.errAddress"));
      return;
    }
    const mobile = indianMobileDigits(phone);
    if (mobile.length !== 10) {
      setError(t("ngo.errPhone"));
      return;
    }
    if (!phoneVerified) {
      setError(t("ngo.errOtp"));
      return;
    }
    if (!authorizedPerson.trim()) {
      setError(t("ngo.errPerson"));
      return;
    }
    if (!isEdit && !kycVerified) {
      setError(t("ngo.errKyc"));
      return;
    }

    setSubmitting(true);
    try {
      const saved = await saveNgoProfile({
        name,
        registrationNo,
        certificateName,
        certificateUrl,
        address,
        phone: `+91${mobile}`,
        authorizedPerson,
      });
      onSaved?.(saved.name);
      router.push("/profile/ngo");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("ngo.errSave"));
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
      <StepPanel
        tone="sky"
        step="01"
        stepLabel={t("ngo.step")}
        title={t("ngo.orgDetails")}
        icon={Building2}
        delayMs={40}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="text-sm font-bold text-ink">{t("ngo.name")}</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-sky-200 bg-white/95 px-4 py-3.5 text-ink shadow-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-300/40"
              placeholder={t("ngo.namePlaceholder")}
              required
            />
          </label>
          <label className="block">
            <span className="text-sm font-bold text-ink">{t("ngo.regNo")}</span>
            <input
              value={registrationNo}
              onChange={(e) => setRegistrationNo(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-sky-200 bg-white/95 px-4 py-3.5 text-ink shadow-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-300/40"
              placeholder={t("ngo.regNoPlaceholder")}
              required
            />
          </label>
          <label className="block">
            <span className="text-sm font-bold text-ink">{t("ngo.certificate")}</span>
            <span className="mt-2 flex items-center gap-3 rounded-2xl border border-dashed border-sky-300 bg-white/95 px-4 py-3">
              <FileUp className="size-4 shrink-0 text-sky-700" aria-hidden />
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">
                {certificateName || t("ngo.certificateHint")}
              </span>
              <span className="shrink-0 text-xs font-black uppercase tracking-wider text-sky-800">
                {t("ngo.chooseFile")}
              </span>
              <input
                type="file"
                accept="image/*,.pdf,application/pdf"
                className="sr-only"
                onChange={(e) => void handleCertificate(e.target.files?.[0])}
              />
            </span>
          </label>
        </div>
      </StepPanel>

      <StepPanel
        tone="slate"
        step="02"
        stepLabel={t("ngo.step")}
        title={t("ngo.address")}
        icon={MapPin}
        delayMs={120}
      >
        <label className="block">
          <textarea
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            rows={3}
            className="w-full rounded-2xl border border-slate-200 bg-white/95 px-4 py-3.5 text-ink shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-300/40"
            placeholder={t("ngo.addressPlaceholder")}
            required
          />
        </label>
      </StepPanel>

      <StepPanel
        tone="amber"
        step="03"
        stepLabel={t("ngo.step")}
        title={t("ngo.officialPhone")}
        icon={Phone}
        delayMs={200}
      >
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <div
            className={cn(
              "flex items-center rounded-2xl border bg-white/95 shadow-sm",
              phoneVerified
                ? "border-emerald-300"
                : "border-amber-200 focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-300/40",
            )}
          >
            <span className="shrink-0 pl-4 font-display text-base font-extrabold text-ink">
              +91
            </span>
            <input
              value={phone}
              onChange={(e) => {
                setPhone(indianMobileDigits(e.target.value));
                setPhoneVerified(false);
                setOtpSent(false);
              }}
              className="min-w-0 flex-1 bg-transparent px-3 py-3.5 text-ink outline-none"
              placeholder="98765 43210"
              inputMode="numeric"
              maxLength={10}
              required
            />
          </div>
          <button
            type="button"
            onClick={sendOtp}
            disabled={sendingOtp || phone.length !== 10}
            className="inline-flex h-12 items-center justify-center rounded-2xl bg-amber-500 px-5 text-sm font-black text-white hover:bg-amber-600 disabled:opacity-60"
          >
            {sendingOtp ? t("ngo.sendingOtp") : t("ngo.sendOtp")}
          </button>
        </div>

        {otpSent && !phoneVerified ? (
          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
            <input
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="h-12 rounded-2xl border border-amber-200 bg-white/95 px-4 text-ink shadow-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-300/40"
              placeholder={t("ngo.otp")}
              inputMode="numeric"
              maxLength={6}
            />
            <button
              type="button"
              onClick={verifyOtp}
              className="inline-flex h-12 items-center justify-center rounded-2xl bg-ink px-5 text-sm font-black text-white"
            >
              {t("ngo.verify")}
            </button>
            <p className="sm:col-span-2 text-xs font-semibold text-amber-800">
              {t("ngo.otpSent")}
            </p>
          </div>
        ) : null}

        {phoneVerified ? (
          <p className="mt-3 text-sm font-bold text-emerald-700">{t("ngo.verified")}</p>
        ) : null}
      </StepPanel>

      <StepPanel
        tone="teal"
        step="04"
        stepLabel={t("ngo.step")}
        title={t("ngo.authorized")}
        icon={UserRound}
        delayMs={280}
      >
        <input
          value={authorizedPerson}
          onChange={(e) => setAuthorizedPerson(e.target.value)}
          className="w-full rounded-2xl border border-teal/20 bg-white/95 px-4 py-3.5 text-ink shadow-sm outline-none transition focus:border-teal focus:ring-2 focus:ring-teal/25"
          placeholder={t("ngo.authorizedPlaceholder")}
          required
        />
      </StepPanel>

      <StepPanel
        tone="indigo"
        step="05"
        stepLabel={t("ngo.step")}
        title={t("ngo.kyc")}
        icon={ShieldCheck}
        delayMs={360}
      >
        <MockKycPanel skip={isEdit} onVerifiedChange={setKycVerified} />
      </StepPanel>

      {error ? (
        <p
          role="alert"
          className="rounded-2xl border border-crimson/30 bg-crimson-soft px-4 py-3 text-sm font-semibold text-crimson-deep"
        >
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={submitting || (!isEdit && !kycVerified)}
        className="shiny-card group relative inline-flex h-16 w-full items-center justify-center gap-2.5 overflow-hidden rounded-2xl bg-gradient-to-r from-[#2563eb] to-[#1e3a8a] text-lg font-extrabold text-white shadow-[0_20px_44px_-14px_rgba(37,99,235,0.85)] ring-1 ring-white/30 transition hover:-translate-y-0.5 hover:brightness-110 disabled:opacity-70 sm:w-auto sm:min-w-80 sm:px-12"
      >
        <span
          className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/30 to-transparent"
          aria-hidden
        />
        {submitting ? (
          <>
            <Loader2 className="relative size-5 animate-spin" /> {t("ngo.saving")}
          </>
        ) : (
          <>
            <Sparkles className="relative size-5 opacity-95" aria-hidden />
            <span className="relative">
              {isEdit ? t("ngo.save") : t("ngo.submit")}
            </span>
          </>
        )}
      </button>
    </form>
  );
}
