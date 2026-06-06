import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Instrument_Serif } from "next/font/google";
import { Toaster } from "sonner";
import { cn } from "@/lib/utils";
import "./globals.css";

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-ibm-mono",
  display: "swap",
});

const instrument = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument",
  display: "swap",
});

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://oneshotcrew.grigoent.co.kr";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: "원샷크루 — 댄스 크루 포트폴리오", template: "%s · 원샷크루" },
  description: "댄스 크루 원샷크루의 포트폴리오·소개·협업 문의.",
  openGraph: { type: "website", locale: "ko_KR", siteName: "원샷크루", title: "원샷크루 — 댄스 크루 포트폴리오", description: "댄스 크루 원샷크루의 포트폴리오·소개·협업 문의.", url: SITE },
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
    shortcut: "/favicon.ico",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "원샷크루",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0A0A0B",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // GEO/AEO: schema.org JSON-LD (Organization + WebSite)
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Organization", "@id": `${SITE}/#organization`, name: "원샷크루", alternateName: "oneshotcrew", url: SITE, email: "contact@grigoent.co.kr", description: "댄스 크루 원샷크루의 포트폴리오·소개·협업 문의.", areaServed: "KR" },
      { "@type": "WebSite", "@id": `${SITE}/#website`, url: SITE, name: "원샷크루", inLanguage: "ko-KR", publisher: { "@id": `${SITE}/#organization` } },
    ],
  };
  return (
    <html lang="ko" className={cn(plexMono.variable, instrument.variable)}>
      <head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <link
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
          rel="stylesheet"
        />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className="antialiased">
        {children}
        <Toaster position="bottom-right" richColors />
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js')}`,
          }}
        />
      </body>
    </html>
  );
}
