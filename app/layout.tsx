import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SITE_URL, searchUrl } from "@/constants/routes";
import Analytics from "@/components/analytics/Analytics";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#3b82f6",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "ParaguAI — Compare preços e descubra as melhores lojas do Paraguai",
    template: "%s | ParaguAI",
  },
  description:
    "Pesquise produtos, compare preços entre lojas e descubra as melhores ofertas no Paraguai com o ParaguAI.",
  keywords: [
    "Paraguai",
    "Ciudad del Este",
    "comparador de preços",
    "eletrônicos",
    "importados",
    "lojas Paraguai",
  ],
  robots: { index: true, follow: true },
  openGraph: {
    siteName: "ParaguAI",
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    site: "@paraguai",
  },
  // Preenchido pelo CTO após registro no Google Search Console
  ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION && {
    verification: {
      google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
      ...(process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION && {
        other: {
          "msvalidate.01": process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION,
        },
      }),
    },
  }),
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "ParaguAI",
  url: SITE_URL,
  potentialAction: {
    "@type": "SearchAction",
    target: `${searchUrl()}?q={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "ParaguAI",
  url: SITE_URL,
  description:
    "A maior plataforma de comparação de preços do Paraguai. Encontre os melhores negócios em Ciudad del Este.",
  areaServed: {
    "@type": "Country",
    name: "Paraguai",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="preconnect" href="https://acairzpzsklctaqjsukw.supabase.co" />
        <link rel="dns-prefetch" href="https://acairzpzsklctaqjsukw.supabase.co" />
      </head>
      <body className="min-h-full flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(websiteJsonLd).replace(/</g, "\\u003c"),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationJsonLd).replace(/</g, "\\u003c"),
          }}
        />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
