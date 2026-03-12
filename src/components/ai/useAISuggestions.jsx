import { useState, useCallback, useRef } from "react";
import { base44 } from "@/api/base44Client";

// In-memory cache: cacheKey → { suggestions, timestamp }
const suggestionCache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function getCacheKey(promptType, context) {
  return `${promptType}::${JSON.stringify(context ?? {})}`;
}

/**
 * Core hook for AI suggestions with client-side rotation.
 *
 * Config shape:
 *   promptType: string        — e.g. "task_title", "task_description"
 *   context: object           — surrounding data passed to the LLM prompt
 *   batchSize?: number        — how many suggestions to fetch at once (default 4)
 *   onAccept?: (val) => void  — called when user accepts a suggestion
 */
export function useAISuggestions({ promptType, context, batchSize = 4, onAccept }) {
  const [suggestions, setSuggestions] = useState([]);
  const [index, setIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]); // accepted values, most-recent first
  const [rateLimited, setRateLimited] = useState(false);
  const rateLimitTimer = useRef(null);

  const fetchBatch = useCallback(async (force = false) => {
    if (rateLimited) return;
    const cacheKey = getCacheKey(promptType, context);

    // Check cache first (unless forced refresh)
    if (!force) {
      const cached = suggestionCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        setSuggestions(cached.suggestions);
        setIndex(0);
        return;
      }
    }

    setIsLoading(true);
    setError(null);

    const prompt = buildPrompt(promptType, context, batchSize);

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          suggestions: { type: "array", items: { type: "string" } }
        }
      }
    });

    const fetched = result?.suggestions ?? [];

    if (fetched.length === 0) {
      // Fall back to static suggestions rather than erroring
      const fallbacks = getStaticFallbacks(promptType);
      setSuggestions(fallbacks);
      setIndex(0);
      suggestionCache.set(cacheKey, { suggestions: fallbacks, timestamp: Date.now() });
    } else {
      setSuggestions(fetched);
      setIndex(0);
      suggestionCache.set(cacheKey, { suggestions: fetched, timestamp: Date.now() });
    }

    setIsLoading(false);
  }, [promptType, context, batchSize, rateLimited]);

  // Rotate to next suggestion; fetch fresh batch when exhausted
  const refresh = useCallback(() => {
    if (suggestions.length === 0) {
      fetchBatch();
      return;
    }
    const next = index + 1;
    if (next >= suggestions.length) {
      // Exhausted batch — fetch a fresh one
      fetchBatch(true);
    } else {
      setIndex(next);
    }
  }, [suggestions, index, fetchBatch]);

  const accept = useCallback((value) => {
    setHistory(h => [value, ...h].slice(0, 10));
    onAccept?.(value);
  }, [onAccept]);

  const current = suggestions[index] ?? null;
  const hasSuggestions = suggestions.length > 0;
  const positionLabel = hasSuggestions ? `${index + 1}/${suggestions.length}` : null;

  return {
    current,
    suggestions,
    index,
    isLoading,
    error,
    history,
    rateLimited,
    hasSuggestions,
    positionLabel,
    fetch: () => fetchBatch(false),
    refresh,
    accept,
  };
}

// ─── Prompt Templates ────────────────────────────────────────────────────────

const PROMPT_TEMPLATES = {
  task_title: (ctx, n) =>
    `Generate ${n} concise, action-oriented task titles for a knowledge management system.
Context:
- Description: ${ctx.description || "not provided"}
- Team: ${ctx.assigned_team || "not specified"}
- Priority: ${ctx.priority || "medium"}
Return ${n} distinct suggestions. Each should be under 80 characters, start with a verb, and be specific.`,

  task_description: (ctx, n) =>
    `Generate ${n} clear task descriptions for a knowledge management system.
Context:
- Title: ${ctx.title || "not provided"}
- Team: ${ctx.assigned_team || "not specified"}
- Priority: ${ctx.priority || "medium"}
Each description should be 1-2 sentences, describe what needs to be done and why, under 200 characters.`,

  document_title: (ctx, n) =>
    `Generate ${n} professional document titles for a knowledge base.
Context:
- Document type: ${ctx.type || "document"}
- Tags/domain: ${(ctx.tags || []).join(", ") || "general"}
- Content snippet: ${ctx.content?.slice(0, 200) || "not provided"}
Titles should be clear, searchable, and professional.`,

  document_summary: (ctx, n) =>
    `Generate ${n} brief document summaries (2-3 sentences each).
Document title: ${ctx.title || "untitled"}
Content: ${ctx.content?.slice(0, 500) || "not provided"}
Each summary should capture the key purpose and main points.`,

  qa_question: (ctx, n) =>
    `Generate ${n} natural question phrasings for a Q&A knowledge base entry.
Answer context: ${ctx.answer?.slice(0, 300) || "not provided"}
Tags: ${(ctx.tags || []).join(", ") || "general"}
Questions should reflect how a real user would ask this.`,

  qa_answer: (ctx, n) =>
    `Generate ${n} clear, helpful answers for a knowledge base Q&A entry.
Question: ${ctx.question || "not provided"}
Available context: ${ctx.context || "general knowledge base"}
Answers should be accurate, concise, and actionable (2-4 sentences each).`,

  workflow_rule_name: (ctx, n) =>
    `Generate ${n} descriptive names for an automation workflow rule.
Trigger type: ${ctx.trigger_type || "event"}
Trigger value: ${ctx.trigger_value || "unknown"}
Action: ${ctx.action || "create_task"}
Names should be clear, under 60 characters, describing what the rule does.`,
};

function buildPrompt(promptType, context, batchSize) {
  const template = PROMPT_TEMPLATES[promptType];
  if (template) return template(context || {}, batchSize);
  // Generic fallback
  return `Generate ${batchSize} suggestions for a form field labeled "${promptType}". 
Context: ${JSON.stringify(context || {})}. 
Return varied, high-quality suggestions appropriate for a professional SaaS application.`;
}

// ─── Static fallbacks for when AI is unavailable ─────────────────────────────

const STATIC_FALLBACKS = {
  task_title: [
    "Review and update documentation",
    "Investigate content gap",
    "Schedule team review session",
    "Create knowledge base entry",
  ],
  task_description: [
    "Analyze the issue and document findings for team review.",
    "Research the topic and create a comprehensive knowledge base entry.",
    "Coordinate with the team to address the identified gap.",
  ],
  document_title: [
    "Process Documentation",
    "Team Knowledge Guide",
    "Standard Operating Procedure",
    "Reference Manual",
  ],
  workflow_rule_name: [
    "Auto-assign on trigger",
    "Notify team on event",
    "Escalate on low confidence",
    "Create task on gap detected",
  ],
};

function getStaticFallbacks(promptType) {
  return STATIC_FALLBACKS[promptType] ?? ["Suggestion 1", "Suggestion 2", "Suggestion 3"];
}