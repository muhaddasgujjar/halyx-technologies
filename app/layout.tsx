import type { Metadata, Viewport } from "next";
import { Instrument_Sans, JetBrains_Mono } from "next/font/google";
import { IS_INDEXABLE, SITE } from "@/lib/site";
import "./globals.css";

/* Display / UI face. The design leans on 400 and 500, with 600 for emphasis. */
const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

/* Mono is only ever used for eyebrows, metadata and status text. */
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--font-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: "Halyx Technologies — We Build Intelligent Systems That Matter",
    template: "%s — Halyx Technologies",
  },
  description: SITE.description,
  applicationName: SITE.name,
  keywords: [
    "applied AI",
    "AI development",
    "machine learning",
    "custom software",
    "product engineering",
    "business automation",
    "data and cloud",
  ],
  authors: [{ name: SITE.name }],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: SITE.url,
    siteName: SITE.name,
    title: "Halyx Technologies — We Build Intelligent Systems That Matter",
    description: SITE.description,
  },
  twitter: {
    card: "summary_large_image",
    title: "Halyx Technologies — We Build Intelligent Systems That Matter",
    description: SITE.description,
  },
  // Preview deployments must never be indexed.
  robots: {
    index: IS_INDEXABLE,
    follow: IS_INDEXABLE,
  },
};

export const viewport: Viewport = {
  themeColor: "#060608",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${instrumentSans.variable} ${jetbrainsMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
