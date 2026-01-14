import { FileText, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

export default function CitationCard({ 
  title, 
  section, 
  score, 
  onClick,
  compact = false 
}) {
  const relevancePercent = Math.round((score || 0.8) * 100);
  
  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex items-start gap-3 w-full text-left rounded-xl border border-slate-200",
        "bg-gradient-to-br from-white to-slate-50/50 hover:border-indigo-300",
        "hover:shadow-md hover:shadow-indigo-100/50 transition-all duration-200",
        compact ? "p-3" : "p-4"
      )}
    >
      <div className={cn(
        "flex-shrink-0 rounded-lg bg-indigo-100 text-indigo-600",
        "group-hover:bg-indigo-500 group-hover:text-white transition-colors",
        compact ? "p-1.5" : "p-2"
      )}>
        <FileText className={compact ? "w-3.5 h-3.5" : "w-4 h-4"} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn(
            "font-medium text-slate-800 truncate",
            compact ? "text-sm" : "text-sm"
          )}>
            {title}
          </span>
          <ExternalLink className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        {section && (
          <p className="text-xs text-slate-500 mt-0.5 truncate">{section}</p>
        )}
        {!compact && (
          <div className="flex items-center gap-2 mt-2">
            <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-indigo-400 to-violet-500 rounded-full"
                style={{ width: `${relevancePercent}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-400 font-medium">
              {relevancePercent}% relevant
            </span>
          </div>
        )}
      </div>
    </button>
  );
}