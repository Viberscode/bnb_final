import type { Metadata } from "next";
import { Bricolage_Grotesque, Noto_Sans_Devanagari, Source_Sans_3 } from "next/font/google";
import { AuthProvider } from "@/components/auth/auth-provider";
import { LanguageProvider } from "@/components/i18n/language-provider";
import { SignInPromptRoot } from "@/components/auth/sign-in-prompt-root";
import "./globals.css";

const display = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

const body = Source_Sans_3({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

const hindi = Noto_Sans_Devanagari({
  variable: "--font-hindi",
  subsets: ["devanagari"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "BloodNearby — Real-time blood donation matching",
    template: "%s · BloodNearby",
  },
  description:
    "BloodNearby connects donors, patients, and verified NGOs/hospitals with intelligent, real-time blood request matching across India.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${hindi.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans text-ink">
        <AuthProvider>
          <LanguageProvider>
            <SignInPromptRoot>{children}</SignInPromptRoot>
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
