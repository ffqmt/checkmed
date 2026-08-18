import type { Metadata } from "next";
import { IBM_Plex_Sans, Fraunces } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

// IBM Plex Sans for dense UI (tables, forms, data) — built for exactly this
// kind of legibility-under-density, and doesn't read as the generic "AI
// default" the way Inter does. Fraunces is a separate display face, used
// only for headlines/wordmark moments (marketing page, email header) — not
// applied to the app's own screens, which stay on the body face throughout.
const bodyFont = IBM_Plex_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const displayFont = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "MedCheck — Validação de atestados médicos",
  description:
    "Plataforma de governança, validação documental e auditoria operacional para atestados médicos.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${bodyFont.variable} ${displayFont.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
