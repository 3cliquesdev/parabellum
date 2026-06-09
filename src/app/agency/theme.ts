import type { CSSProperties } from "react";

export const agencyPageStyle: CSSProperties = {
  fontFamily: "var(--font-sans)",
};

export const agencyCardStyle: CSSProperties = {
  background: "var(--surface-gradient)",
  border: "1px solid var(--border-subtle)",
  boxShadow: "var(--card-shadow)",
};

export const agencyCardStrongStyle: CSSProperties = {
  ...agencyCardStyle,
  border: "1px solid var(--active-soft-border)",
};

export const agencyPanelStyle: CSSProperties = {
  background: "var(--surface-panel)",
  border: "1px solid var(--border-subtle)",
};

export const agencySoftPanelStyle: CSSProperties = {
  background: "var(--surface-soft)",
  border: "1px solid var(--border-subtle)",
};

export const agencyPrimaryPanelStyle: CSSProperties = {
  background: "var(--active-soft-bg)",
  border: "1px solid var(--active-soft-border)",
};

export const agencyInputClass =
  "w-full h-9 px-3 rounded-xl text-sm outline-none transition-colors";

export const agencyInputStyle: CSSProperties = {
  background: "var(--input-bg)",
  border: "1px solid var(--input-border)",
  color: "var(--text-primary)",
};

export const agencyTextareaStyle: CSSProperties = {
  ...agencyInputStyle,
  minHeight: "84px",
};

export const agencyGhostButtonStyle: CSSProperties = {
  background: "var(--ghost-bg)",
  color: "var(--text-secondary)",
  border: "1px solid var(--chip-border)",
};

export const agencyPrimaryButtonStyle: CSSProperties = {
  background: "var(--status-ganho)",
  color: "#0a0a0a",
};

export function withAlpha(color: string, alpha: string) {
  if (color.startsWith("#") && color.length === 7) {
    return `${color}${alpha}`;
  }

  return color;
}

export function agencyTintStyle(color: string, alpha = "14"): CSSProperties {
  return {
    background: withAlpha(color, alpha),
  };
}

export function agencyBadgeStyle(color: string): CSSProperties {
  return {
    color,
    background: withAlpha(color, "14"),
    border: `1px solid ${withAlpha(color, "2b")}`,
  };
}

export function agencyOutlineButtonStyle(color: string): CSSProperties {
  return {
    color,
    background: withAlpha(color, "12"),
    border: `1px solid ${withAlpha(color, "2b")}`,
  };
}
