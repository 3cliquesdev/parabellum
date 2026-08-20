// Limites reais da Meta Cloud API (WhatsApp) por tipo de midia - usado tanto
// no client (feedback imediato) quanto no server (nunca confiar so no
// client). https://developers.facebook.com/docs/whatsapp/cloud-api/reference/media
const LIMITS_BYTES: Record<string, number> = {
  image: 5 * 1024 * 1024,
  audio: 16 * 1024 * 1024,
  video: 16 * 1024 * 1024,
  document: 100 * 1024 * 1024,
  sticker: 500 * 1024,
};

function categoriaDoMime(mimeType: string): keyof typeof LIMITS_BYTES {
  if (mimeType === "image/webp") return "sticker";
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType.startsWith("video/")) return "video";
  return "document";
}

export function getMediaLimitBytes(mimeType: string): number {
  return LIMITS_BYTES[categoriaDoMime(mimeType)];
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function validarTamanhoArquivo(file: { size: number; type: string }): { ok: true } | { ok: false; erro: string } {
  const limite = getMediaLimitBytes(file.type);
  if (file.size > limite) {
    return { ok: false, erro: `Arquivo muito grande (${formatBytes(file.size)}). Limite para esse tipo: ${formatBytes(limite)}.` };
  }
  return { ok: true };
}
