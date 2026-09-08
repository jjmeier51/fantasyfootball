"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { Trophy, User, Calendar, BookOpen, Swords, BarChart3, ListOrdered, Sparkles, Search } from "lucide-react";
import type { OwnerLite } from "@/lib/types";
import OwnerAvatar from "./OwnerAvatar";

export default function CommandPalette({ owners, years }: { owners: OwnerLite[]; years: number[] }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    document.addEventListener("lg:palette", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("lg:palette", onOpen);
    };
  }, []);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  if (!open) return null;
  const pages = [
    { href: "/trophy-room", label: "Trophy Room", icon: Trophy },
    { href: "/records", label: "Records Book", icon: BookOpen },
    { href: "/head-to-head", label: "Head-to-Head", icon: Swords },
    { href: "/rankings", label: "All-Time Rankings", icon: BarChart3 },
    { href: "/drafts", label: "Draft History", icon: ListOrdered },
    { href: "/matchups", label: "Matchup Explorer", icon: Search },
    { href: "/fun-facts", label: "Fun Facts", icon: Sparkles },
  ];
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-[12vh] px-4" onClick={() => setOpen(false)}>
      <Command
        label="Search"
        className="w-full max-w-lg card overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        loop
      >
        <Command.Input
          autoFocus
          placeholder="Search owners, seasons, pages…"
          className="w-full bg-transparent px-4 py-3 text-sm outline-none border-b border-border placeholder:text-muted"
        />
        <Command.List className="max-h-[50vh] overflow-y-auto p-2 scrollbar-thin">
          <Command.Empty className="px-3 py-6 text-center text-sm text-muted">No results.</Command.Empty>
          <Command.Group heading="Owners" className="text-[10px] uppercase tracking-widest text-muted px-2 pt-2">
            {owners.map((o) => (
              <Command.Item
                key={o.key}
                value={`owner ${o.name} ${o.key}`}
                onSelect={() => go(`/owners/${o.key}`)}
                className="flex items-center gap-3 px-2 py-2 rounded-md text-sm text-text cursor-pointer data-[selected=true]:bg-gold/15"
              >
                <OwnerAvatar owner={o} size={24} /> {o.name}
              </Command.Item>
            ))}
          </Command.Group>
          <Command.Group heading="Seasons" className="text-[10px] uppercase tracking-widest text-muted px-2 pt-2">
            {years.map((y) => (
              <Command.Item
                key={y}
                value={`season ${y}`}
                onSelect={() => go(`/seasons/${y}`)}
                className="flex items-center gap-3 px-2 py-2 rounded-md text-sm text-text cursor-pointer data-[selected=true]:bg-gold/15"
              >
                <Calendar size={16} className="text-muted" /> {y} season
              </Command.Item>
            ))}
          </Command.Group>
          <Command.Group heading="Pages" className="text-[10px] uppercase tracking-widest text-muted px-2 pt-2">
            {pages.map((p) => (
              <Command.Item
                key={p.href}
                value={`page ${p.label}`}
                onSelect={() => go(p.href)}
                className="flex items-center gap-3 px-2 py-2 rounded-md text-sm text-text cursor-pointer data-[selected=true]:bg-gold/15"
              >
                <p.icon size={16} className="text-muted" /> {p.label}
              </Command.Item>
            ))}
            <Command.Item value="page owners" onSelect={() => go("/owners")} className="flex items-center gap-3 px-2 py-2 rounded-md text-sm text-text cursor-pointer data-[selected=true]:bg-gold/15">
              <User size={16} className="text-muted" /> All Owners
            </Command.Item>
          </Command.Group>
        </Command.List>
      </Command>
    </div>
  );
}
