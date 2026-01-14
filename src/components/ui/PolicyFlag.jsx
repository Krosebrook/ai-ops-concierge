import { cn } from "@/lib/utils";
import { AlertTriangle, Lock, Eye, FileWarning } from "lucide-react";

const flagConfig = {
  pii_warning: {
    icon: Eye,
    label: "PII Detected",
    description: "This content may contain personal information",
    className: "bg-amber-50 border-amber-200 text-amber-800"
  },
  secrets_detected: {
    icon: Lock,
    label: "Secrets Found",
    description: "API keys or credentials detected",
    className: "bg-red-50 border-red-200 text-red-800"
  },
  internal_only: {
    icon: FileWarning,
    label: "Internal Only",
    description: "Not approved for external sharing",
    className: "bg-slate-100 border-slate-300 text-slate-700"
  },
  needs_review: {
    icon: AlertTriangle,
    label: "Needs Human Review",
    description: "This response should be verified before use",
    className: "bg-violet-50 border-violet-200 text-violet-800"
  }
};

export default function PolicyFlag({ type, compact = false }) {
  const config = flagConfig[type] || flagConfig.needs_review;
  const Icon = config.icon;
  
  if (compact) {
    return (
      <div className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium border",
        config.className
      )}>
        <Icon className="w-3 h-3" />
        <span>{config.label}</span>
      </div>
    );
  }
  
  return (
    <div className={cn(
      "flex items-start gap-3 p-3 rounded-lg border",
      config.className
    )}>
      <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
      <div>
        <p className="text-sm font-medium">{config.label}</p>
        <p className="text-xs opacity-80 mt-0.5">{config.description}</p>
      </div>
    </div>
  );
}