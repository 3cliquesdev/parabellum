"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

interface AudioPlayerProps {
  src: string;
  durationHint?: number | null;
  accent?: string;
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  return `${min}:${String(sec).padStart(2, "0")}`;
}

// Waveform pseudo-deterministico derivado da URL (mesma midia sempre gera a
// mesma "forma") - decorativo, nao decodifica o audio real via Web Audio API
// (isso fica pra uma fase futura se valer a pena visualmente).
function waveformBars(seed: string, count: number): number[] {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  const bars: number[] = [];
  for (let i = 0; i < count; i++) {
    hash = (hash * 1103515245 + 12345) >>> 0;
    bars.push(0.25 + (hash % 100) / 100 * 0.75);
  }
  return bars;
}

export function AudioPlayer({ src, durationHint, accent = "var(--status-ganho)" }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(durationHint ?? 0);
  const bars = useMemo(() => waveformBars(src, 28), [src]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setCurrent(audio.currentTime);
    const onLoaded = () => {
      if (Number.isFinite(audio.duration)) setDuration(audio.duration);
    };
    const onEnded = () => {
      setPlaying(false);
      setCurrent(0);
    };
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      void audio.play();
      setPlaying(true);
    }
  }

  const progresso = duration > 0 ? current / duration : 0;

  return (
    <div className="flex items-center gap-2.5 min-w-[220px]">
      <audio ref={audioRef} src={src} preload="none" className="hidden" />
      <button
        type="button"
        onClick={togglePlay}
        className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95"
        style={{ background: accent, color: "#0a0a0a" }}
      >
        {playing ? <Pause className="w-4 h-4" fill="currentColor" /> : <Play className="w-4 h-4 ml-0.5" fill="currentColor" />}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-end gap-[2px] h-6">
          {bars.map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-full transition-colors"
              style={{
                height: `${h * 100}%`,
                background: i / bars.length <= progresso ? accent : "var(--border-subtle)",
                minWidth: 2,
              }}
            />
          ))}
        </div>
        <p className="text-[10px] mt-0.5" style={{ color: "var(--text-faint)" }}>
          {formatTime(playing || current > 0 ? current : duration)}
        </p>
      </div>
    </div>
  );
}
