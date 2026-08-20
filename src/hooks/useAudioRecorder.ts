"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type RecorderState = "idle" | "recording" | "recorded" | "error";

function pickMimeType(): string {
  const candidatos = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  for (const tipo of candidatos) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(tipo)) return tipo;
  }
  return "";
}

export function useAudioRecorder() {
  const [state, setState] = useState<RecorderState>("idle");
  const [seconds, setSeconds] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mimeTypeRef = useRef("");

  const cleanupStream = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => cleanupStream, [cleanupStream]);

  const start = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setState("error");
      setErrorMessage("Gravação de áudio não é suportada neste navegador.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = pickMimeType();
      mimeTypeRef.current = mimeType;
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const gravado = new Blob(chunksRef.current, { type: mimeTypeRef.current || "audio/webm" });
        setBlob(gravado);
        setState("recorded");
        cleanupStream();
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setState("recording");
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch {
      setState("error");
      setErrorMessage("Não foi possível acessar o microfone. Verifique a permissão do navegador.");
    }
  }, [cleanupStream]);

  const stop = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const cancel = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
    }
    cleanupStream();
    chunksRef.current = [];
    setBlob(null);
    setSeconds(0);
    setState("idle");
  }, [cleanupStream]);

  const reset = useCallback(() => {
    setBlob(null);
    setSeconds(0);
    setState("idle");
    setErrorMessage(null);
  }, []);

  return { state, seconds, blob, errorMessage, start, stop, cancel, reset };
}
