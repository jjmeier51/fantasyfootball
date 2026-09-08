import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import ThemePlayer from "@/components/ThemePlayer";
import CommandPalette from "@/components/CommandPalette";
import { meta, ownersLite, seasons } from "@/lib/data";

// Atlassian's Charlie Display / Charlie Text are proprietary; these are the closest open pairing.
const sans = Inter({ variable: "--font-sans-src", subsets: ["latin"] });
const display = Plus_Jakarta_Sans({ variable: "--font-display-src", subsets: ["latin"], weight: ["600", "700", "800"] });

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
    <html lang="en" className={`${sans.variable} ${display.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <ThemePlayer>
          <Nav leagueName={meta.leagueName} isSample={meta.isSample} />
          <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">{children}</main>
          <Footer />
          <CommandPalette owners={ownersLite} years={seasons.map((s) => s.year)} />
        </ThemePlayer>
      </body>
    </html>
  );
}
