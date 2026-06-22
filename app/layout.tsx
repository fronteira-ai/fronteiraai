import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SITE_URL, searchUrl } from "@/constants/routes";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "ParaguAI — Compare preços e descubra as melhores lojas do Paraguai",
    template: "%s | ParaguAI",
  },
  description:
    "Pesquise produtos, compare preços entre centenas de lojas e descubra as melhores ofertas no Paraguai com o ParaguAI.",
};

// JSON-LD WebSite + SearchAction: habilita a "sitelinks search box" do Google
// e dá a base estrutural de busca para futuras integrações de IA.
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
      <body className="min-h-full flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(websiteJsonLd).replace(/</g, "\\u003c"),
          }}
        />
        {children}
      </body>
    </html>
  );
}
