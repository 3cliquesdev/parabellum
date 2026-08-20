"use client";

import { useState } from "react";
import { FileText, Send, X } from "lucide-react";
import { formatBytes } from "@/lib/inbox/mediaLimits";

interface MediaAttachmentPreviewProps {
  file: File;
  previewUrl: string;
  uploading: boolean;
  uploadProgress: number;
  onCancel: () => void;
  onSend: (legenda: string) => void;
}

export function MediaAttachmentPreview({ file, previewUrl, uploading, uploadProgress, onCancel, onSend }: MediaAttachmentPreviewProps) {
  const [legenda, setLegenda] = useState("");
  const isImage = file.type.startsWith("image/");
  const isVideo = file.type.startsWith("video/");

  return (
    <div className="rounded-2xl p-3 mb-2 flex items-center gap-3" style={{ background: "var(--surface-soft)", border: "1px solid var(--border-subtle)" }}>
      <div className="w-14 h-14 rounded-xl overflow-hidden flex items-center justify-center shrink-0" style={{ background: "var(--surface-panel)" }}>
        {isImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="preview" className="w-full h-full object-cover" />
        ) : isVideo ? (
          <video src={previewUrl} className="w-full h-full object-cover" muted />
        ) : (
          <FileText className="w-6 h-6" style={{ color: "var(--text-secondary)" }} />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold truncate" style={{ color: "var(--text-primary)" }}>{file.name}</p>
        <p className="text-[10px]" style={{ color: "var(--text-faint)" }}>{formatBytes(file.size)}</p>
        {uploading ? (
          <div className="w-full h-1 rounded-full mt-1.5 overflow-hidden" style={{ background: "var(--border-subtle)" }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${uploadProgress}%`, background: "var(--status-ganho)" }} />
          </div>
        ) : (
          <input
            value={legenda}
            onChange={(e) => setLegenda(e.target.value)}
            placeholder="Adicionar legenda (opcional)..."
            className="w-full mt-1 text-xs outline-none bg-transparent"
            style={{ color: "var(--text-secondary)" }}
          />
        )}
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button type="button" onClick={onCancel} disabled={uploading} className="p-2 rounded-full disabled:opacity-40" style={{ color: "var(--text-faint)" }} title="Cancelar">
          <X className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onSend(legenda)}
          disabled={uploading}
          className="w-9 h-9 rounded-full flex items-center justify-center disabled:opacity-50"
          style={{ background: "var(--status-ganho)", color: "#0a0a0a" }}
          title="Enviar"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
