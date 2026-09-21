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
    /*
     * Leads with the category, not the tagline. "We Build Intelligent Systems
     * That Matter" is good positioning and a poor title tag: it contains no
     * term anyone searches for. The tagline still carries the brand in the
     * OpenGraph title below, where it is read rather than matched.
     */
    default: "Applied AI & Software Studio | Halyx Technologies",
    template: "%s — Halyx Technologies",
  },
  description:
    "We build AI systems and custom software that ship and hold up in production. Five products live now. Free scoping call, and a reply within two working days.",
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
  /*
   * Search Console's HTML-tag verification, if that route is used.
   *
   * Only emitted when the token is set, so previews and local runs carry
   * nothing. The DNS-TXT route is preferable — it verifies the apex and `www`
   * as one property and survives a host change — but this is here because the
   * tag route needs no DNS access, and an unset variable costs nothing.
   */
  verification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
    : undefined,
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
        {/*
         * One speech agent for the whole app: the console near the foot of the
         * page and the floating chat dock must drive the same loop, or the
         * visitor gets two sessions — two microphones, two greetings, two of
         * everything. The provider is the single place the loop is mounted.
         */}
        <LocaleProvider>
          {children}
        </LocaleProvider>
      </body>
    </html>
  );
}
