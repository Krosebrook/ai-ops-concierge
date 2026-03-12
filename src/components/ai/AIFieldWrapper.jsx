import { useEffect, useRef } from "react";
import { useAISuggestions } from "./useAISuggestions";
import AISuggestionBubble from "./AISuggestionBubble";

/**
 * Wraps any input or textarea with AI suggestion capabilities.
 *
 * Usage:
 *   <AIFieldWrapper
 *     promptType="task_title"
 *     context={{ description, assigned_team }}
 *     onAccept={(val) => setTitle(val)}
 *     autoFetch
 *   >
 *     {({ onKeyDown }) => (
 *       <Input value={title} onChange={...} onKeyDown={onKeyDown} />
 *     )}
 *   </AIFieldWrapper>
 *
 * Keyboard shortcuts injected into the child:
 *   Tab         — accept current suggestion
 *   Cmd+Enter   — refresh to next suggestion
 */
export default function AIFieldWrapper({
  promptType,
  context,
  batchSize = 4,
  onAccept,
  autoFetch = false,
  label,
  children,
}) {
  const suggestions = useAISuggestions({ promptType, context, batchSize, onAccept });
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (autoFetch && !fetchedRef.current) {
      fetchedRef.current = true;
      suggestions.fetch();
    }
  }, [autoFetch]);

  const handleKeyDown = (e) => {
    // Tab → accept suggestion (only if suggestion is showing)
    if (e.key === "Tab" && suggestions.current) {
      e.preventDefault();
      suggestions.accept(suggestions.current);
    }
    // Cmd/Ctrl + Enter → refresh
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      suggestions.refresh();
    }
  };

  return (
    <div className="relative">
      {children({ onKeyDown: handleKeyDown })}
      <AISuggestionBubble
        {...suggestions}
        label={label}
        promptType={promptType}
      />
    </div>
  );
}