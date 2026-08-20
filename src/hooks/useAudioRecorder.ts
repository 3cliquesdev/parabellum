"use client";

import { useCallback, useRef, useState } from "react";
import Recorder from "opus-recorder";

export type RecorderState = "idle" | "recording" | "recorded" | "error";

// MediaRecorder nativo grava audio/webm no Chrome/Firefox, mas o WhatsApp
// Cloud API SO aceita audio/ogg (opus), audio/aac, audio/mp4, audio/mpeg ou
// audio/amr para mensagens de audio - webm e rejeitado no upload pra Meta, e
// alem disso tem bug conhecido de duracao/seek em blobs webm no Chrome. Por
// isso usamos opus-recorder (WASM), que gera um .ogg real e valido desde a
// gravacao, funcionando igual em qualquer navegador.
export function useAudioRecorder() {
  const [state, setState] = useState<RecorderState>("idle");
  const [seconds, setSeconds] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const recorderRef = useRef<Recorder | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const start = useCallback(async () => {
    if (typeof window === "undefined" || !Recorder.isRecordingSupported()) {
      setState("error");
      setErrorMessage("Gravação de áudio não é suportada neste navegador.");
      return;
    }

    try {
      const recorder = new Recorder({
        encoderPath: "/vendor/encoderWorker.min.js",
        numberOfChannels: 1,
        encoderSampleRate: 24000,
        encoderBitRate: 32000,
      });

      recorder.ondataavailable = (arrayBuffer) => {
        setBlob(new Blob([arrayBuffer], { type: "audio/ogg" }));
        setState("recorded");
      };

      recorderRef.current = recorder;
      await recorder.start();
      setState("recording");
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch {
      setState("error");
      setErrorMessage("Não foi possível acessar o microfone. Verifique a permissão do navegador.");
    }
  }, []);

  const stop = useCallback(() => {
    stopTimer();
    recorderRef.current?.stop();
  }, [stopTimer]);

  const cancel = useCallback(() => {
    stopTimer();
    if (recorderRef.current) {
      recorderRef.current.ondataavailable = () => {};
      recorderRef.current.close();
      recorderRef.current = null;
    }
    setBlob(null);
    setSeconds(0);
    setState("idle");
  }, [stopTimer]);

  const reset = useCallback(() => {
    recorderRef.current?.close();
    recorderRef.current = null;
    setBlob(null);
    setSeconds(0);
    setState("idle");
    setErrorMessage(null);
  }, []);

  return { state, seconds, blob, errorMessage, start, stop, cancel, reset };
}
