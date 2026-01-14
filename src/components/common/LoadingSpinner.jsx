import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Reusable loading spinner component
 * @param {Object} props - Component props
 * @param {string} props.size - Size variant (sm, md, lg)
 * @param {string} props.text - Optional loading text
 * @param {boolean} props.fullScreen - Show as full screen loader
 */
export default function LoadingSpinner({ size = "md", text, fullScreen = false, className }) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8"
  };

  const content = (
    <div className={cn(
      "flex flex-col items-center justify-center gap-3",
      fullScreen && "min-h-screen",
      className
    )}>
      <Loader2 className={cn("animate-spin text-slate-400", sizeClasses[size])} />
      {text && <p className="text-sm text-slate-500">{text}</p>}
    </div>
  );

  return content;
}