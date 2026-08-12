/** Soft dark stage only — no person / no full-screen drops */
export function HeroLifeBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-gradient-to-b from-[#2a1218] via-[#1c0d14] to-[#140c16]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(196,18,47,0.28),transparent_58%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_60%,rgba(15,118,110,0.14),transparent_48%)]" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#1c0d14]/70 via-[#1c0d14]/28 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#1c0d14]/45 via-transparent to-[#1c0d14]/20" />
    </div>
  );
}
