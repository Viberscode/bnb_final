import { redirect } from "next/navigation";

export default async function AuthRoutePage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; callbackUrl?: string; next?: string }>;
}) {
  const params = await searchParams;
  const role = params.role;
  const next =
    params.next ||
    params.callbackUrl ||
    (role === "donor"
      ? "/become-donor"
      : role === "patient"
        ? "/request-help"
        : role === "ngo"
          ? "/profile"
          : "/");

  redirect(`/?signin=1&next=${encodeURIComponent(next)}`);
}
