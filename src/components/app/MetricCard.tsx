import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  change: string;
  positive: boolean;
}

export function MetricCard({ icon: Icon, label, value, change, positive }: MetricCardProps) {
  return (
    <div className="glass glass-hover rounded-2xl p-5">
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center">
          <Icon className="w-5 h-5 text-blue-400" />
        </div>
        <span
          className={cn(
            "text-xs font-medium px-2 py-0.5 rounded-full",
            positive
              ? "text-green-400 bg-green-400/10"
              : "text-red-400 bg-red-400/10"
          )}
        >
          {change}
        </span>
      </div>
      <p className="text-2xl font-semibold text-white">{value}</p>
      <p className="text-sm text-white/50 mt-0.5">{label}</p>
    </div>
  );
}
