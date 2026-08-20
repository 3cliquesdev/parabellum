"use client";

import { useEffect } from "react";

// Ate agora nao existia nenhuma visibilidade de erro de cliente - quando a
// pagina falhava pra alguem, so descobriamos por print de tela. Isso escuta
// erro de JS nao tratado, promise rejeitada e falha de rede (fetch que nunca
// completa/reseta a conexao) e manda pro backend, com throttle simples pra
// nao inundar o endpoint se algo entrar em loop de erro.
const MAX_REPORTS_POR_SESSAO = 15;
let enviados = 0;

function reportar(tipo: string, mensagem: string, stack?: string) {
  if (enviados >= MAX_REPORTS_POR_SESSAO) return;
  enviados += 1;
  const payload = JSON.stringify({
    tipo,
    mensagem: mensagem.slice(0, 2000),
    stack: stack?.slice(0, 2000),
    url: window.location.href,
  });
  try {
    const enviado = navigator.sendBeacon?.("/api/client-errors", payload);
    if (!enviado) {
      fetch("/api/client-errors", { method: "POST", headers: { "Content-Type": "application/json" }, body: payload, keepalive: true }).catch(() => {});
    }
  } catch {
    // silencioso: reportar erro nao pode gerar outro erro
  }
}

export function ClientErrorReporter() {
  useEffect(() => {
    function aoErrar(event: ErrorEvent) {
      reportar("window_error", event.message, event.error?.stack);
    }
    function aoRejeitar(event: PromiseRejectionEvent) {
      const razao = event.reason;
      const mensagem = razao instanceof Error ? razao.message : String(razao);
      reportar("unhandled_rejection", mensagem, razao instanceof Error ? razao.stack : undefined);
    }
    window.addEventListener("error", aoErrar);
    window.addEventListener("unhandledrejection", aoRejeitar);
    return () => {
      window.removeEventListener("error", aoErrar);
      window.removeEventListener("unhandledrejection", aoRejeitar);
    };
  }, []);

  return null;
}
