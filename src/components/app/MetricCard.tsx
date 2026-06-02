import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  change: string;
  positive: boolean;
}

export function MetricCard({ icon: Icon, label, value, change, positive }: MetricCardProps) {
  return (
    <div className="rounded-2xl p-6 flex flex-col gap-4 transition-all duration-150"
      style={{
        background: "var(--surface-gradient)",
        border: "1px solid var(--border-subtle)",
      }}>
      <div className="flex items-start justify-between">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: "var(--primary-bg)", border: "1px solid var(--primary-border)" }}>
          <Icon className="w-4 h-4" style={{ color: "var(--status-ganho)" }} />
        </div>
        {change && (
          <span className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={positive ? {
              color: "var(--status-ganho)",
              background: "var(--accent)",
            } : {
              color: "var(--status-perdido)",
              background: "rgba(248,113,113,0.1)",
            }}>
            {change}
          </span>
        )}
      </div>
      <div>
        <p className="text-[22px] font-extrabold text-white tracking-[-0.02em]">{value}</p>
        <p className="text-xs mt-0.5 font-medium" style={{ color: "var(--text-secondary)" }}>{label}</p>
      </div>
    </div>
  );
}
