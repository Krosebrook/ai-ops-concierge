import { useState } from "react";
import { Sparkles, RefreshCw, Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAISuggestions } from "./useAISuggestions";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Simpler inline variant — just a sparkle button that appends to a field.
 * Useful for textarea fields where you want a floating "Generate" button
 * rather than an always-visible bubble.
 *
 * Usage:
 *   <div className="relative">
 *     <Textarea value={desc} onChange={...} />
 *     <AIInlineAssist
 *       promptType="task_description"
 *       context={{ title }}
 *       onAccept={(val) => setDesc(val)}
 *       className="absolute bottom-2 right-2"
 *     />
 *   </div>
 */
export default function AIInlineAssist({
  promptType,
  context,
  onAccept,
  className,
  placeholder = "Generate with AI",
}) {
  const [open, setOpen] = useState(false);
  const suggestions = useAISuggestions({ promptType, context, batchSize: 3, onAccept });

  const handleOpen = () => {
    setOpen(true);
    if (!suggestions.hasSuggestions) {
      suggestions.fetch();
    }
  };

  const handleAccept = (val) => {
    suggestions.accept(val);
    setOpen(false);
  };

  return (
    <div className={cn("relative", className)}>
      {!open ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleOpen}
          className="h-7 gap-1.5 text-xs text-indigo-600 border-indigo-200 hover:bg-indigo-50 bg-white/90 backdrop-blur-sm"
        >
          <Sparkles className="w-3 h-3" />
          {placeholder}
        </Button>
      ) : (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white border border-indigo-100 rounded-xl shadow-lg p-3 w-72 z-20 relative"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-medium text-indigo-600">
                <Sparkles className="w-3.5 h-3.5" />
                AI Suggestions
              </div>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {suggestions.isLoading && (
              <div className="flex items-center gap-2 py-3 text-sm text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                Generating suggestions…
              </div>
            )}

            {!suggestions.isLoading && suggestions.suggestions.length > 0 && (
              <div className="space-y-1.5">
                {suggestions.suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleAccept(s)}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-800 transition-colors border border-transparent hover:border-indigo-100 flex items-start gap-2 group"
                  >
                    <Check className="w-3.5 h-3.5 text-indigo-400 mt-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <span>{s}</span>
                  </button>
                ))}
                <div className="pt-1 flex justify-between items-center">
                  <span className="text-[10px] text-slate-400">Click to apply</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => suggestions.refresh()}
                    className="h-6 text-xs text-indigo-500 hover:text-indigo-700 px-2"
                    disabled={suggestions.isLoading}
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Refresh
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}