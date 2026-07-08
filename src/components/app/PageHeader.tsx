import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  /** Optional slot rendered on the right (buttons, filters, etc). */
  actions?: ReactNode;
  className?: string;
}

/**
 * Cabeçalho padrão das páginas do app. Substitui o markup
 * `text-2xl font-extrabold` repetido inline em 20+ telas.
 */
export function PageHeader({ title, subtitle, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div className="min-w-0">
        <h1 className="text-lg font-semibold tracking-tight text-white">{title}</h1>
        {subtitle && (
          <p className="text-[13px] mt-0.5" style={{ color: "var(--text-secondary)" }}>
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

export default PageHeader;
