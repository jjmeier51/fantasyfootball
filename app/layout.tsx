import type { Metadata } from "next";
import { Bebas_Neue, Inter } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import ThemePlayer from "@/components/ThemePlayer";
import CommandPalette from "@/components/CommandPalette";
import { meta, ownersLite, seasons } from "@/lib/data";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const bebas = Bebas_Neue({ variable: "--font-bebas", subsets: ["latin"], weight: "400" });

export const metadata: Metadata = {
  metadataBase: new URL("https://leagueofgangstars.com"),
  title: { default: meta.leagueName, template: `%s · ${meta.leagueName}` },
  description: `The complete history of ${meta.leagueName}: trophies, records, rivalries and fun facts since ${meta.firstSeason}.`,
  openGraph: { title: meta.leagueName, description: `Fantasy football history since ${meta.firstSeason}.`, type: "website" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${bebas.variable} h-full antialiased`}>
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
