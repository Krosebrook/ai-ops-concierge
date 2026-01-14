import { cn } from "@/lib/utils";

const tagColors = {
  Support: "bg-blue-50 text-blue-700 border-blue-200",
  Ops: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Sales: "bg-violet-50 text-violet-700 border-violet-200",
  Compliance: "bg-amber-50 text-amber-700 border-amber-200",
  default: "bg-slate-50 text-slate-700 border-slate-200"
};

export default function TagBadge({ tag, onRemove, size = "sm" }) {
  const colorClass = tagColors[tag] || tagColors.default;
  
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-full border font-medium",
      colorClass,
      size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm"
    )}>
      {tag}
      {onRemove && (
        <button 
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="ml-0.5 hover:opacity-70 transition-opacity"
        >
          ×
        </button>
      )}
    </span>
  );
}