import React from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import App from "./App.tsx";
import "./index.css";

// Limpar IndexedDB antigo (cache Dexie) se existir - evita cache persistente
if ('indexedDB' in window) {
  try {
    indexedDB.deleteDatabase('CRMChatDB');
    console.log('[Main] Cache IndexedDB antigo limpo');
  } catch (e) {
    console.warn('[Main] Erro ao limpar IndexedDB:', e);
  }
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
