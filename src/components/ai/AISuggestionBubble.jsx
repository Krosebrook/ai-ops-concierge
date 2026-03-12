import { useState } from "react";
import { Sparkles, RefreshCw, Check, X, ChevronDown, ChevronUp, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

/**
 * The visual suggestion UI that attaches below a field.
 * Receives all state from useAISuggestions via AIFieldWrapper.
 */
export default function AISuggestionBubble({
  current,
  isLoading,
  error,
  rateLimited,
  hasSuggestions,
  positionLabel,
  history,
  fetch,
  refresh,
  accept,
  label,
}) {
  const [showHistory, setShowHistory] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Re-show if we get new suggestions
  if (dismissed && (isLoading || current)) {
    setDismissed(false);
  }

  const isVisible = !dismissed && (isLoading || hasSuggestions || error);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15 }}
          className="mt-1.5"
        >
          <div className={cn(
            "rounded-xl border bg-gradient-to-r from-indigo-50/80 to-violet-50/80 border-indigo-100 p-2.5",
            "flex items-start gap-2"
          )}>
            {/* Icon */}
            <div className="flex-shrink-0 w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mt-0.5">
              {isLoading
                ? <Loader2 className="w-3 h-3 text-white animate-spin" />
                : <Sparkles className="w-3 h-3 text-white" />
              }
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {isLoading && !hasSuggestions && (
                <div className="space-y-1.5 py-0.5">
                  <div className="h-3 bg-indigo-100 rounded animate-pulse w-3/4" />
                  <div className="h-3 bg-indigo-100 rounded animate-pulse w-1/2" />
                </div>
              )}

              {error && !isLoading && (
                <div className="flex items-center gap-1.5 text-xs text-red-600">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Couldn't load suggestions</span>
                  <button
                    onClick={fetch}
                    className="underline hover:no-underline ml-1"
                  >
                    Retry
                  </button>
                </div>
              )}

              {rateLimited && (
                <p className="text-xs text-amber-600">AI suggestions are temporarily unavailable. Try again in a moment.</p>
              )}

              {current && !isLoading && (
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm text-slate-700 leading-snug flex-1">
                      <span className="text-[10px] font-medium text-indigo-500 uppercase tracking-wider mr-1.5">AI</span>
                      {current}
                    </p>
                    {positionLabel && (
                      <span className="text-[10px] text-indigo-400 flex-shrink-0 mt-0.5">{positionLabel}</span>
                    )}
                  </div>

                  {/* Keyboard hint */}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-slate-400">
                      <kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded text-[9px]">Tab</kbd> accept
                      &nbsp;·&nbsp;
                      <kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded text-[9px]">⌘↵</kbd> refresh
                    </span>
                  </div>
                </div>
              )}

              {/* History */}
              {history.length > 0 && (
                <div className="mt-1">
                  <button
                    onClick={() => setShowHistory(v => !v)}
                    className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-600 transition-colors"
                  >
                    {showHistory ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    {history.length} previous suggestion{history.length > 1 ? "s" : ""}
                  </button>
                  <AnimatePresence>
                    {showHistory && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-1.5 space-y-1">
                          {history.map((h, i) => (
                            <div
                              key={i}
                              className="flex items-center justify-between gap-2 px-2 py-1.5 bg-white/70 rounded-lg text-xs text-slate-600 group"
                            >
                              <span className="truncate">{h}</span>
                              <button
                                onClick={() => accept(h)}
                                className="opacity-0 group-hover:opacity-100 text-indigo-500 hover:text-indigo-700 transition-opacity flex-shrink-0"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Action buttons */}
            {current && !isLoading && (
              <div className="flex items-center gap-1 flex-shrink-0">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => accept(current)}
                  className="h-7 w-7 p-0 rounded-lg bg-white hover:bg-emerald-50 hover:text-emerald-600 border border-slate-200"
                  title="Accept suggestion"
                >
                  <Check className="w-3.5 h-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={refresh}
                  disabled={isLoading}
                  className="h-7 w-7 p-0 rounded-lg bg-white hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200"
                  title="Next suggestion (⌘↵)"
                >
                  <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setDismissed(true)}
                  className="h-7 w-7 p-0 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-400 hover:text-slate-600"
                  title="Dismiss"
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}

            {/* Fetch button when no suggestions loaded yet */}
            {!hasSuggestions && !isLoading && !error && (
              <Button
                size="sm"
                variant="ghost"
                onClick={fetch}
                className="h-7 px-2 text-xs text-indigo-600 hover:bg-indigo-100 flex-shrink-0"
              >
                <Sparkles className="w-3 h-3 mr-1" />
                Suggest
              </Button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}