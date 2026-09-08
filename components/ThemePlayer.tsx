"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { Volume2, VolumeX } from "lucide-react";
import clsx from "clsx";

const STORAGE_KEY = "lg:muted";
const TRACK = "/audio/theme.mp3";
const TARGET_VOLUME = 0.55;

// ---- tiny external store for the mute preference (survives reloads via localStorage)
const listeners = new Set<() => void>();
function readMuted(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}
function writeMuted(v: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, v ? "1" : "0");
  } catch {}
  listeners.forEach((l) => l());
}
function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}
const noop = () => () => {};

interface SoundCtx {
  muted: boolean;
  playing: boolean;
  needsGesture: boolean;
  hydrated: boolean;
  toggle: () => void;
  play: () => void;
}
const Ctx = createContext<SoundCtx | null>(null);

/**
 * Site-wide theme music. Wraps the whole app so the track keeps playing across page
 * navigations. Browsers block audio until the user interacts: we try to autoplay, and if
 * refused we show a small "Tap for sound" pill and start on the first gesture anywhere.
 * A visible mute button lives in the nav (SoundButton) and floats on mobile.
 */
export default function ThemePlayer({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeRef = useRef<number | null>(null);
  const muted = useSyncExternalStore(subscribe, readMuted, () => true);
  const hydrated = useSyncExternalStore(noop, () => true, () => false);
  const [playing, setPlaying] = useState(false);
  const [needsGesture, setNeedsGesture] = useState(false);

  const fadeTo = useCallback((target: number, ms = 1800) => {
    const a = audioRef.current;
    if (!a) return;
    if (fadeRef.current) cancelAnimationFrame(fadeRef.current);
    const start = a.volume;
    const t0 = performance.now();
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / ms);
      a.volume = start + (target - start) * k;
      if (k < 1) fadeRef.current = requestAnimationFrame(step);
      else if (target === 0) a.pause();
    };
    fadeRef.current = requestAnimationFrame(step);
  }, []);

  const tryPlay = useCallback(async () => {
    const a = audioRef.current;
    if (!a) return;
    try {
      a.volume = 0;
      await a.play();
      setPlaying(true);
      setNeedsGesture(false);
      fadeTo(TARGET_VOLUME);
    } catch {
      setPlaying(false);
      setNeedsGesture(true);
    }
  }, [fadeTo]);

  // autoplay attempt once hydrated (unless the visitor muted us before)
  useEffect(() => {
    if (!hydrated || muted) return;
    const a = audioRef.current;
    if (!a) return;
    a.volume = 0;
    let cancelled = false;
    a.play()
      .then(() => {
        if (cancelled) return;
        setPlaying(true);
        setNeedsGesture(false);
        fadeTo(TARGET_VOLUME);
      })
      .catch(() => {
        if (!cancelled) setNeedsGesture(true);
      });
    return () => {
      cancelled = true;
    };
  }, [hydrated, muted, fadeTo]);

  // first gesture anywhere unlocks playback when autoplay was refused
  useEffect(() => {
    if (!needsGesture || muted) return;
    const handler = () => void tryPlay();
    const opts = { once: true, passive: true } as AddEventListenerOptions;
    window.addEventListener("pointerdown", handler, opts);
    window.addEventListener("keydown", handler, opts);
    window.addEventListener("touchstart", handler, opts);
    return () => {
      window.removeEventListener("pointerdown", handler);
      window.removeEventListener("keydown", handler);
      window.removeEventListener("touchstart", handler);
    };
  }, [needsGesture, muted, tryPlay]);

  const toggle = useCallback(() => {
    const next = !readMuted();
    writeMuted(next);
    if (next) {
      fadeTo(0, 500);
      setPlaying(false);
      setNeedsGesture(false);
    } else {
      void tryPlay();
    }
  }, [fadeTo, tryPlay]);

  const value: SoundCtx = { muted, playing, needsGesture, hydrated, toggle, play: () => void tryPlay() };

  return (
    <Ctx.Provider value={value}>
      {children}
      <audio ref={audioRef} src={TRACK} loop preload="auto" />
      {hydrated && (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
          {needsGesture && !muted && (
            <button
              type="button"
              onClick={() => void tryPlay()}
              data-testid="tap-for-sound"
              className="ticker-in rounded-full bg-gold text-bg text-xs font-semibold px-3 py-1.5 shadow-lg shadow-gold/30"
            >
              Tap for sound
            </button>
          )}
          <SoundButton floating />
        </div>
      )}
    </Ctx.Provider>
  );
}

export function useSound() {
  return useContext(Ctx);
}

/** The visible mute/unmute control. Rendered in the nav on desktop and floating on mobile. */
export function SoundButton({ floating }: { floating?: boolean }) {
  const s = useSound();
  if (!s || !s.hydrated) return null;
  const { muted, playing, toggle } = s;
  if (floating) {
    return (
      <button
        type="button"
        onClick={toggle}
        aria-label={muted ? "Unmute theme music" : "Mute theme music"}
        className={clsx(
          "md:hidden relative w-11 h-11 rounded-full border flex items-center justify-center backdrop-blur bg-bg/80",
          muted ? "border-border text-muted" : "border-gold/60 text-gold",
          playing && !muted && "pulse-ring",
        )}
      >
        {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={toggle}
      data-testid="sound-toggle"
      aria-pressed={!muted}
      aria-label={muted ? "Unmute theme music" : "Mute theme music"}
      title={muted ? "Play theme music" : "Mute theme music"}
      className={clsx(
        "relative flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        muted ? "border-border text-muted hover:text-text hover:border-gold/50" : "border-gold/60 text-gold bg-gold/10",
        playing && !muted && "pulse-ring",
      )}
    >
      {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
      <span className="hidden md:inline">{muted ? "Sound off" : "Now playing"}</span>
    </button>
  );
}
