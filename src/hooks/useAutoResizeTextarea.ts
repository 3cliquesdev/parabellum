import { useLayoutEffect } from "react";

/**
 * Hook para auto-resize de textarea até X linhas, depois scroll interno.
 * Calcula padding real via getComputedStyle para não "cortar" texto.
 */
export function useAutoResizeTextarea(
  ref: React.RefObject<HTMLTextAreaElement>,
  value: string,
  maxRows = 6,
  lineHeightPx = 22
) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Medir padding real via getComputedStyle (não depende do tema)
    const computed = window.getComputedStyle(el);
    const padTop = parseFloat(computed.paddingTop || "0");
    const padBottom = parseFloat(computed.paddingBottom || "0");
    const verticalPadding = padTop + padBottom;

    el.style.height = "0px";

    const maxHeight = maxRows * lineHeightPx + verticalPadding;
    const next = Math.min(el.scrollHeight, maxHeight);
    
    el.style.height = `${next}px`;
    el.style.overflowY = el.scrollHeight > maxHeight ? "auto" : "hidden";
  }, [ref, value, maxRows, lineHeightPx]);
}
