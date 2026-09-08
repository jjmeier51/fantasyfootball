"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, Search, X } from "lucide-react";
import clsx from "clsx";
import { SoundButton } from "./ThemePlayer";

const LINKS = [
  { href: "/trophy-room", label: "Trophy Room" },
  { href: "/records", label: "Records" },
  { href: "/owners", label: "Owners" },
  { href: "/seasons", label: "Seasons" },
  { href: "/head-to-head", label: "Head-to-Head" },
  { href: "/rankings", label: "Rankings" },
  { href: "/drafts", label: "Drafts" },
  { href: "/matchups", label: "Matchups" },
  { href: "/fun-facts", label: "Fun Facts" },
];

export default function Nav({ leagueName, isSample }: { leagueName: string; isSample: boolean }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-bg/80 border-b border-border">
      {isSample && (
        <div className="bg-gold/15 text-gold-2 text-xs text-center py-1 px-3">
          Showing sample data. Add your ESPN league secrets and run the sync to see real history.
        </div>
      )}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-4">
        <Link href="/" className="flex items-center gap-3 shrink-0" aria-label="Home">
          <span className="w-9 h-9 rounded-full bg-linear-to-br from-gold-2 to-gold-dim flex items-center justify-center font-display text-bg text-xl leading-none pt-0.5">
            LG
          </span>
          <span className="font-display text-2xl tracking-wide gold-text hidden sm:inline">{leagueName}</span>
        </Link>
        <nav className="hidden lg:flex items-center gap-1 ml-4">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={clsx(
                "px-3 py-2 rounded-md text-sm font-medium transition-colors",
                path.startsWith(l.href) ? "text-gold bg-gold/10" : "text-text-2 hover:text-text hover:bg-white/5",
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => document.dispatchEvent(new CustomEvent("lg:palette"))}
            className="hidden sm:flex items-center gap-2 text-xs text-muted border border-border rounded-md px-2.5 py-1.5 hover:border-gold/50 hover:text-text"
            aria-label="Search"
          >
            <Search size={14} /> Search <kbd className="ml-1 text-[10px] border border-border rounded px-1">⌘K</kbd>
          </button>
          <div className="hidden md:flex items-center"><SoundButton /></div>
          <button
            type="button"
            className="lg:hidden p-2 rounded-md hover:bg-white/5"
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
            aria-expanded={open}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
      {open && (
        <nav className="lg:hidden border-t border-border bg-bg-elev px-4 py-3 grid grid-cols-2 gap-1">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className={clsx("px-3 py-2 rounded-md text-sm", path.startsWith(l.href) ? "text-gold bg-gold/10" : "text-text-2")}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
