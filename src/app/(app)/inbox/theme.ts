import type { CSSProperties } from "react";

export const inboxPageStyle: CSSProperties = {
  fontFamily: "var(--font-sans)",
  background: "var(--bg)",
  color: "var(--text-primary)",
};

export const inboxPanelStyle: CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border-subtle)",
  boxShadow: "0 18px 42px rgba(2, 6, 23, 0.06)",
};

export const inboxSubtlePanelStyle: CSSProperties = {
  background: "var(--surface-panel)",
  border: "1px solid var(--border-subtle)",
};

export const inboxComposerStyle: CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border-subtle)",
  boxShadow: "0 12px 34px rgba(2, 6, 23, 0.05)",
};

export const inboxInputStyle: CSSProperties = {
  background: "var(--input-bg)",
  border: "1px solid var(--input-border)",
  color: "var(--text-primary)",
};

export function withAlpha(color: string, alpha: string) {
  if (color.startsWith("#") && color.length === 7) {
    return `${color}${alpha}`;
  }

  return color;
}

export function inboxBadgeStyle(color: string): CSSProperties {
  return {
    color,
    background: withAlpha(color, "14"),
    border: `1px solid ${withAlpha(color, "2b")}`,
  };
}

// Tons fixos do sistema (nao vindos do banco) - resolvidos por variavel de
// tema em vez de hex cru, senao o texto do badge fica tunado so pro modo
// escuro e ilegivel no claro (ex: cinza claro em fundo quase-branco).
export type InboxBadgeTone = "neutral" | "blue" | "yellow" | "green";

export function inboxBadgeTone(tone: InboxBadgeTone): CSSProperties {
  return {
    color: `var(--badge-${tone}-fg)`,
    background: `var(--badge-${tone}-bg)`,
    border: `1px solid var(--badge-${tone}-border)`,
  };
}

export function inboxConversationItemStyle(active: boolean): CSSProperties {
  return {
    background: active ? "var(--active-soft-bg)" : "transparent",
    borderBottom: "1px solid var(--border-subtle)",
    borderLeft: active ? "2px solid var(--status-ganho)" : "2px solid transparent",
    transition: "background 0.15s ease, border-color 0.15s ease, transform 0.15s ease",
  };
}

export function inboxBubbleStyle(kind: "lead" | "humano" | "ia"): CSSProperties {
  if (kind === "lead") {
    return {
      background: "var(--chat-inbound-bg)",
      color: "var(--chat-inbound-text)",
      border: "1px solid var(--chat-inbound-border)",
      borderRadius: "8px 18px 18px 18px",
      boxShadow: "0 10px 18px rgba(2, 6, 23, 0.06)",
    };
  }

  if (kind === "ia") {
    return {
      background: "var(--chat-ai-bg)",
      color: "var(--chat-ai-text)",
      border: "1px solid var(--chat-ai-border)",
      borderRadius: "18px 8px 18px 18px",
      boxShadow: "0 10px 18px rgba(2, 6, 23, 0.05)",
    };
  }

  return {
    background: "var(--chat-outbound-bg)",
    color: "var(--chat-outbound-text)",
    border: "1px solid var(--chat-outbound-border)",
    borderRadius: "18px 8px 18px 18px",
    boxShadow: "0 10px 18px rgba(2, 6, 23, 0.05)",
  };
}

export const inboxCanvasStyle: CSSProperties = {
  backgroundColor: "var(--chat-canvas)",
  backgroundImage:
    "radial-gradient(circle at 14% 12%, var(--chat-glow) 0, transparent 24%), radial-gradient(circle at 86% 10%, var(--chat-glow-soft) 0, transparent 20%), radial-gradient(circle at 1px 1px, var(--chat-pattern) 1px, transparent 0)",
  backgroundSize: "auto, auto, 28px 28px",
};

export const inboxPrimaryButtonStyle: CSSProperties = {
  background: "var(--status-ganho)",
  color: "var(--badge-primary-fg)",
};

export const inboxGhostButtonStyle: CSSProperties = {
  background: "var(--ghost-bg)",
  color: "var(--text-secondary)",
  border: "1px solid var(--chip-border)",
};
