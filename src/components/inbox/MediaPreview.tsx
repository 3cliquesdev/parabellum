import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Download, FileText, File, Image as ImageIcon, Video, ExternalLink, X } from "lucide-react";
import { AudioPlayer } from "./AudioPlayer";
import { cn } from "@/lib/utils";

interface MediaPreviewProps {
  url: string;
  mimeType: string;
  filename: string;
  size?: number;
  waveformData?: number[];
  durationSeconds?: number;
  className?: string;
  compact?: boolean;
}

export function MediaPreview({
  url,
  mimeType,
  filename,
  size,
  waveformData,
  durationSeconds,
  className,
  compact = false,
}: MediaPreviewProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [imageError, setImageError] = useState(false);

  const isImage = mimeType.startsWith("image/");
  const isAudio = mimeType.startsWith("audio/");
  const isVideo = mimeType.startsWith("video/");
  const isPDF = mimeType === "application/pdf";

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Audio Preview
  if (isAudio) {
    return (
      <AudioPlayer
        url={url}
        waveformData={waveformData}
        durationSeconds={durationSeconds}
        filename={filename}
        className={className}
        compact={compact}
      />
    );
  }

  // Image Preview
  if (isImage && !imageError) {
    return (
      <>
        <div
          className={cn(
            "relative group cursor-pointer rounded-xl overflow-hidden border border-border/50",
            compact ? "max-w-[200px]" : "max-w-[300px]",
            className
          )}
          onClick={() => setIsModalOpen(true)}
          role="button"
          aria-label={`View ${filename}`}
        >
          <img
            src={url}
            alt={filename}
            className="w-full h-auto object-cover"
            onError={() => setImageError(true)}
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              <ExternalLink className="h-6 w-6 text-white drop-shadow-lg" />
            </div>
          </div>
        </div>

        {/* Fullscreen Modal */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 overflow-hidden">
            <DialogTitle className="sr-only">{filename}</DialogTitle>
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 z-10 bg-black/50 hover:bg-black/70 text-white rounded-full"
                onClick={() => setIsModalOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-12 z-10 bg-black/50 hover:bg-black/70 text-white rounded-full"
                onClick={handleDownload}
              >
                <Download className="h-4 w-4" />
              </Button>
              <img
                src={url}
                alt={filename}
                className="w-full h-auto max-h-[85vh] object-contain"
              />
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Video Preview
  if (isVideo) {
    return (
      <div
        className={cn(
          "rounded-xl overflow-hidden border border-border/50",
          compact ? "max-w-[240px]" : "max-w-[320px]",
          className
        )}
      >
        <video
          src={url}
          controls
          preload="metadata"
          className="w-full h-auto"
          aria-label={filename}
        >
          <source src={url} type={mimeType} />
          Seu navegador não suporta vídeo.
        </video>
      </div>
    );
  }

  // PDF Preview
  if (isPDF) {
    return (
      <div
        className={cn(
          "flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-background/50",
          compact && "p-2 gap-2",
          className
        )}
      >
        <div className="shrink-0 p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
          <FileText className="h-6 w-6 text-red-600 dark:text-red-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{filename}</p>
          {size && <p className="text-xs text-muted-foreground">{formatSize(size)}</p>}
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => window.open(url, "_blank")}
            className="h-8 w-8"
            aria-label="Open PDF"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDownload}
            className="h-8 w-8"
            aria-label="Download PDF"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  // Generic File Preview
  const getFileIcon = () => {
    if (mimeType.includes("image")) return <ImageIcon className="h-6 w-6" />;
    if (mimeType.includes("video")) return <Video className="h-6 w-6" />;
    return <File className="h-6 w-6" />;
  };

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-background/50",
        compact && "p-2 gap-2",
        className
      )}
    >
      <div className="shrink-0 p-2 rounded-lg bg-muted">
        {getFileIcon()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{filename}</p>
        {size && <p className="text-xs text-muted-foreground">{formatSize(size)}</p>}
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleDownload}
        className="shrink-0 h-8 w-8"
        aria-label="Download file"
      >
        <Download className="h-4 w-4" />
      </Button>
    </div>
  );
}
