import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import ThemePlayer from "@/components/ThemePlayer";
import CommandPalette from "@/components/CommandPalette";
import PageShimmer from "@/components/PageShimmer";
import { meta, ownersLite, seasons } from "@/lib/data";

// One typeface everywhere: Inter for body text and, in heavier weights, for headlines and numbers.
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

const description = `The complete history of ${meta.leagueName}: trophies, records, rivalries and fun facts since ${meta.firstSeason}.`;

export const metadata: Metadata = {
  metadataBase: new URL("https://leagueofgangstars.com"),
  title: { default: meta.leagueName, template: `%s · ${meta.leagueName}` },
  description,
  openGraph: {
    title: meta.leagueName,
    description: `Fantasy football history since ${meta.firstSeason}. Trophies, records, rivalries and receipts.`,
    type: "website",
    siteName: meta.leagueName,
    url: "https://leagueofgangstars.com",
    locale: "en_US",
  },
  twitter: { card: "summary_large_image", title: meta.leagueName, description },
  appleWebApp: { title: meta.leagueName },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <ThemePlayer>
          <PageShimmer />
          <Nav leagueName={meta.leagueName} isSample={meta.isSample} />
          <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">{children}</main>
          <Footer />
          <CommandPalette owners={ownersLite} years={seasons.map((s) => s.year)} />
        </ThemePlayer>
      </body>
    </html>
  );
}
