import { MockModeBanner } from "@egofi/ui";
import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});
const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

// Absolute base for the share-card URL. Next only emits a relative og:image
// without it, which most crawlers reject.
const siteUrl = process.env["NEXT_PUBLIC_SITE_URL"] ?? "http://localhost:3002";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Egofi Merchant Portal",
  description: "Manage your crypto payment gateway",
  // icon.png, apple-icon.png and opengraph-image.png in this directory are
  // picked up by Next's file conventions — no manual <link> tags needed.
  openGraph: {
    title: "Egofi Merchant Portal",
    description: "Manage your crypto payment gateway",
    siteName: "egofi",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Egofi Merchant Portal",
    description: "Manage your crypto payment gateway",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable}`}>
      <body className="min-h-screen font-sans">
        {children}
        <MockModeBanner />
      </body>
    </html>
  );
}
