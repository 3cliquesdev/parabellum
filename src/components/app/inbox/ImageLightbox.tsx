"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import { Dialog, DialogPortal } from "@/components/ui/dialog";

interface ImageLightboxProps {
  src: string | null;
  onClose: () => void;
}

export function ImageLightbox({ src, onClose }: ImageLightboxProps) {
  return (
    <Dialog open={Boolean(src)} onOpenChange={(open) => !open && onClose()}>
      <DialogPortal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/80 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <DialogPrimitive.Popup className="fixed inset-0 z-50 flex items-center justify-center p-6 outline-none">
          {src && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt="Imagem em tela cheia" className="max-w-full max-h-full rounded-lg object-contain" />
          )}
          <DialogPrimitive.Close
            className="fixed top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.12)", color: "white" }}
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </DialogPrimitive.Close>
        </DialogPrimitive.Popup>
      </DialogPortal>
    </Dialog>
  );
}
