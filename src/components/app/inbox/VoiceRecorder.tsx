"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Mic, Send, Trash2, X } from "lucide-react";
import type { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { AudioPlayer } from "./AudioPlayer";

interface VoiceRecorderProps {
  recorder: ReturnType<typeof useAudioRecorder>;
  onSend: (file: File, durationSeg: number) => Promise<void> | void;
  disabled?: boolean;
}

function formatTime(seconds: number): string {
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${min}:${String(sec).padStart(2, "0")}`;
}

export function VoiceRecorderButton({ recorder, disabled }: { recorder: ReturnType<typeof useAudioRecorder>; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => void recorder.start()}
      className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all disabled:opacity-50"
      style={{ background: "var(--ghost-bg)", color: "var(--text-secondary)", border: "1px solid var(--chip-border)" }}
      title="Gravar áudio"
    >
      <Mic className="w-4 h-4" />
    </button>
  );
}

export function VoiceRecorderActive({ recorder, onSend, disabled }: VoiceRecorderProps) {
  const { state, seconds, blob, errorMessage, stop, cancel, reset } = recorder;

  if (state === "error") {
    return (
      <div className="flex items-center gap-2 text-xs flex-1" style={{ color: "var(--status-perdido)" }}>
        <span>{errorMessage}</span>
        <button type="button" onClick={reset} className="underline shrink-0">
          fechar
        </button>
      </div>
    );
  }

  if (state === "recording") {
    return (
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        <motion.button
          type="button"
          onClick={stop}
          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
          style={{ background: "var(--status-perdido)", color: "white" }}
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ repeat: Infinity, duration: 1.2 }}
          title="Parar gravação"
        >
          <div className="w-3 h-3 rounded-sm" style={{ background: "white" }} />
        </motion.button>
        <span className="text-sm font-semibold tabular-nums" style={{ color: "var(--text-primary)" }}>
          {formatTime(seconds)}
        </span>
        <span className="text-xs" style={{ color: "var(--text-faint)" }}>
          Gravando...
        </span>
        <button type="button" onClick={cancel} className="ml-auto p-1.5 rounded-full" style={{ color: "var(--text-faint)" }} title="Cancelar">
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // state === "recorded"
  const url = blob ? URL.createObjectURL(blob) : null;

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2.5 flex-1 min-w-0">
        {url && <AudioPlayer src={url} durationHint={seconds} />}
        <button type="button" onClick={cancel} className="p-1.5 rounded-full shrink-0" style={{ color: "var(--text-faint)" }} title="Descartar">
          <Trash2 className="w-4 h-4" />
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={async () => {
            if (!blob) return;
            const extensao = blob.type.includes("mp4") ? "mp4" : "webm";
            const file = new File([blob], `nota-de-voz-${Date.now()}.${extensao}`, { type: blob.type });
            await onSend(file, seconds);
            reset();
          }}
          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 disabled:opacity-50"
          style={{ background: "var(--status-ganho)", color: "#0a0a0a" }}
          title="Enviar áudio"
        >
          <Send className="w-4 h-4" />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
