import type { Metadata, Viewport } from "next";
import { Inter, Barlow_Condensed } from "next/font/google";
import "./globals.css";

import Footer from "@/components/Footer";
import SiteHeader from "@/components/SiteHeader";
import FollowUs from "@/components/FollowUs";
import { JsonLd } from "@/components/seo";
import { KEYWORDS, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import { SOCIAL_LINKS } from "@/lib/socialLinks";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const barlow = Barlow_Condensed({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "IPL 2027 Retentions, Releases & Auction Live | Cricmawa",
    template: "%s | Cricmawa",
  },
  description: SITE_DESCRIPTION,
  keywords: KEYWORDS,
  applicationName: SITE_NAME,
  authors: [{ name: "Cricmawa", url: "https://www.youtube.com/@cric_mawa" }],
  creator: "Cricmawa",
  publisher: "Cricmawa",
  category: "sports",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_IN",
    url: "/",
    title: "IPL 2027 Retentions, Releases & Auction Live | Cricmawa",
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    site: "@cricmawa",
    creator: "@cricmawa",
    title: "IPL 2027 Retentions, Releases & Auction Live | Cricmawa",
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0b0d",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-IN">
      <body
        className={`${inter.variable} ${barlow.variable} flex min-h-screen flex-col antialiased`}
      >
        <JsonLd
          data={[
            {
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "Cricmawa",
              url: SITE_URL,
              logo: `${SITE_URL}/images/cricmawa_logo.png`,
              sameAs: SOCIAL_LINKS.filter((l) => !l.key.startsWith("whatsapp")).map((l) => l.url),
            },
            {
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: SITE_NAME,
              url: SITE_URL,
              inLanguage: "en-IN",
            },
          ]}
        />
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <Footer />
        <FollowUs />
      </body>
    </html>
  );
}
