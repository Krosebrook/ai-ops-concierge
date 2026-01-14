import { cn } from "@/lib/utils";
import { Shield, ShieldAlert, ShieldCheck } from "lucide-react";

const confidenceConfig = {
  high: {
    icon: ShieldCheck,
    label: "High Confidence",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200"
  },
  medium: {
    icon: Shield,
    label: "Medium Confidence",
    className: "bg-amber-50 text-amber-700 border-amber-200"
  },
  low: {
    icon: ShieldAlert,
    label: "Low Confidence",
    className: "bg-rose-50 text-rose-700 border-rose-200"
  }
};

export default function ConfidenceBadge({ level = "medium", showLabel = true }) {
  const config = confidenceConfig[level] || confidenceConfig.medium;
  const Icon = config.icon;
  
  return (
    <div className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
      config.className
    )}>
      <Icon className="w-3.5 h-3.5" />
      {showLabel && <span>{config.label}</span>}
    </div>
  );
}