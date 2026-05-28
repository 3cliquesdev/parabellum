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
        background: "linear-gradient(180deg, rgba(23,23,23,0.88) 0%, rgba(13,13,13,0.92) 100%)",
        border: "1px solid rgba(255,255,255,0.07)",
        boxShadow: "inset 0px 0px 2px 0px rgba(234,234,234,0.05)",
      }}>
      <div className="flex items-start justify-between">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: "rgba(154,234,98,0.08)", border: "1px solid rgba(154,234,98,0.12)" }}>
          <Icon className="w-4 h-4" style={{ color: "#9aea62" }} />
        </div>
        <span className="text-xs font-bold px-2 py-0.5 rounded-full"
          style={positive ? {
            color: "#9aea62",
            background: "rgba(154,234,98,0.1)",
          } : {
            color: "#f87171",
            background: "rgba(248,113,113,0.1)",
          }}>
          {change}
        </span>
      </div>
      <div>
        <p className="text-[22px] font-extrabold text-white tracking-[-0.02em]">{value}</p>
        <p className="text-xs mt-0.5 font-medium" style={{ color: "#939da4" }}>{label}</p>
      </div>
    </div>
  );
}
