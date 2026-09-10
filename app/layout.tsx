import type { Metadata, Viewport } from "next";
import { Instrument_Sans, JetBrains_Mono } from "next/font/google";
import { LocaleProvider } from "@/components/LocaleProvider";
import { HYDRATION_GUARD } from "@/lib/extension-attrs";
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
  width: "device-width",
  initialScale: 1,
  // Pinch-zoom stays available: capping the scale would fail WCAG 1.4.4.
  maximumScale: 5,
  // Let the page paint under a notch; fixed chrome pads itself back out with
  // `env(safe-area-inset-*)`.
  viewportFit: "cover",
  // The on-screen keyboard shrinks the viewport instead of sliding fixed
  // elements out of reach, which keeps the chat dock and the contact form
  // usable while typing on a phone.
  interactiveWidget: "resizes-content",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${instrumentSans.variable} ${jetbrainsMono.variable}`}
      // Extensions decorate <html> and <body> with generated attribute names
      // the guard below cannot enumerate. See lib/extension-attrs.ts.
      suppressHydrationWarning
    >
      <head>
        {/*
         * Must run before React hydrates, so it is inline in <head> rather than
         * in a component: it undoes the DOM edits browser extensions make to the
         * server HTML, which would otherwise be reported as hydration mismatches.
         */}
        <script dangerouslySetInnerHTML={{ __html: HYDRATION_GUARD }} />
      </head>
      {/*
       * The locale store wraps everything because the two components that care
       * about it are as far apart as they can be: the switcher in the navbar
       * and the voice console near the foot of the page. It renders English on
       * the server, so `lang="en"` above is correct for the first paint and the
       * provider updates it once a stored choice is read.
       */}
      <body suppressHydrationWarning>
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  );
}
