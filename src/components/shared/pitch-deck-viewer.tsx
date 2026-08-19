"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ChevronLeft, Maximize, Minimize } from "lucide-react";
import type { PitchSlide, PitchTheme } from "@/lib/pitch-deck";

const THEME_CLASSES: Record<PitchTheme, { bg: string; text: string; eyebrow: string; dot: string }> = {
  navy: { bg: "bg-gradient-to-br from-[#1b3a5c] to-[#0c1c2e]", text: "text-white", eyebrow: "text-white/70", dot: "bg-white" },
  warm: { bg: "bg-gradient-to-br from-amber-500 to-orange-600", text: "text-white", eyebrow: "text-white/80", dot: "bg-white" },
  wine: { bg: "bg-gradient-to-br from-rose-900 to-red-950", text: "text-white", eyebrow: "text-white/70", dot: "bg-white" },
  teal: { bg: "bg-gradient-to-br from-teal-600 to-emerald-800", text: "text-white", eyebrow: "text-white/75", dot: "bg-white" },
  blue: { bg: "bg-gradient-to-br from-blue-600 to-indigo-800", text: "text-white", eyebrow: "text-white/75", dot: "bg-white" },
  violet: { bg: "bg-gradient-to-br from-violet-600 to-purple-900", text: "text-white", eyebrow: "text-white/75", dot: "bg-white" },
  cue: { bg: "bg-card", text: "text-foreground", eyebrow: "text-primary", dot: "bg-primary" },
};

export function PitchDeckViewer({ slides }: { slides: PitchSlide[] }) {
  const [index, setIndex] = React.useState(0);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const stageRef = React.useRef<HTMLDivElement>(null);

  const slide = slides[index];
  const theme = THEME_CLASSES[slide.theme];
  const isCue = slide.theme === "cue";

  const goTo = React.useCallback(
    (next: number) => setIndex((current) => Math.min(Math.max(next, 0), slides.length - 1)),
    [slides.length],
  );

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowRight") goTo(index + 1);
      if (e.key === "ArrowLeft") goTo(index - 1);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [index, goTo]);

  React.useEffect(() => {
    function onFullscreenChange() {
      setIsFullscreen(document.fullscreenElement === stageRef.current);
    }
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  async function toggleFullscreen() {
    if (!stageRef.current) return;
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await stageRef.current.requestFullscreen();
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link href="/ops/documentacao" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Documentação
        </Link>
        <button
          type="button"
          onClick={toggleFullscreen}
          className="flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          {isFullscreen ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
          {isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
        </button>
      </div>

      <div
        ref={stageRef}
        className={`flex min-h-[560px] flex-col justify-between overflow-hidden rounded-2xl p-10 shadow-lg sm:p-14 ${theme.bg} ${isFullscreen ? "justify-center" : ""}`}
      >
        {isCue && (
          <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border-2 border-dashed border-primary/40 px-3 py-1 text-xs font-medium text-primary">
            Só para quem apresenta — não é conteúdo pro cliente
          </div>
        )}

        <div className="flex-1">
          <p className={`text-xs font-semibold uppercase tracking-[0.2em] ${theme.eyebrow}`}>{slide.eyebrow}</p>
          <h1
            className={`mt-4 font-[family-name:var(--font-display)] text-3xl leading-tight font-medium text-balance sm:text-5xl ${theme.text}`}
          >
            {slide.title}
          </h1>
          {slide.subtitle && <p className={`mt-5 max-w-2xl text-lg sm:text-xl ${theme.text} opacity-90`}>{slide.subtitle}</p>}
          {slide.bullets && (
            <ul className="mt-7 space-y-3">
              {slide.bullets.map((bullet) => (
                <li key={bullet} className={`flex items-start gap-3 text-lg sm:text-xl ${theme.text}`}>
                  <span className={`mt-2.5 size-1.5 shrink-0 rounded-full ${theme.dot} opacity-80`} />
                  <span className="opacity-95">{bullet}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {slide.footer && <p className={`mt-8 max-w-xl text-sm ${theme.text} opacity-70`}>{slide.footer}</p>}
      </div>

      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => goTo(index - 1)}
          disabled={index === 0}
          className="flex items-center gap-1 rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium disabled:opacity-40"
        >
          <ChevronLeft className="size-4" /> Anterior
        </button>

        <div className="flex items-center gap-1.5">
          {slides.map((s, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Ir para o slide ${i + 1}`}
              onClick={() => goTo(i)}
              className={`size-2 rounded-full transition-all ${i === index ? "w-5 bg-primary" : "bg-border hover:bg-muted-foreground/40"}`}
            />
          ))}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground tabular-nums">
            {index + 1} / {slides.length}
          </span>
          <button
            type="button"
            onClick={() => goTo(index + 1)}
            disabled={index === slides.length - 1}
            className="flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-40"
          >
            Próximo <ArrowRight className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
