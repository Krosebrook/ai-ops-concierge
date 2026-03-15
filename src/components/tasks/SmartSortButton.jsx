import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";

/**
 * SmartSortButton
 * Sends the current task list to the AI to re-rank by urgency,
 * business impact, and team capacity, then surfaces the sorted order.
 *
 * Props:
 *   tasks: Task[]                        – the current filtered task list
 *   onSorted: (sortedTasks: Task[]) => void  – callback with re-ranked list
 *   isSmartSorted: boolean               – whether smart sort is currently applied
 *   onReset: () => void                  – resets to default ordering
 */
export default function SmartSortButton({ tasks, onSorted, isSmartSorted, onReset }) {
  const [isLoading, setIsLoading] = useState(false);

  const handleSmartSort = async () => {
    if (tasks.length === 0) {
      toast.info("No tasks to sort.");
      return;
    }

    setIsLoading(true);
    try {
      const taskSummaries = tasks.map((t, i) => ({
        index: i,
        id: t.id,
        title: t.title,
        description: t.description || "",
        priority: t.priority,
        status: t.status,
        assigned_team: t.assigned_team || "unassigned",
        is_automated: t.is_automated || false,
        due_date: t.due_date || null,
        created_date: t.created_date,
      }));

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a project management AI. Re-rank the following tasks by overall business priority.
Consider these factors in order of importance:
1. **Urgency** – tasks with "urgent" or "high" priority, upcoming due dates, or critical status should rank higher
2. **Business Impact** – tasks likely affecting customers, revenue, compliance, or core operations rank higher
3. **Team Capacity** – tasks that are "in_progress" or unblocked should be surfaced over stalled/cancelled ones
4. Do NOT include tasks with status "completed" or "cancelled" at the top.

Tasks (as JSON):
${JSON.stringify(taskSummaries, null, 2)}

Return a JSON object with a single key "ranked_ids" – an array of task IDs in the recommended order (highest priority first). Include ALL task IDs.`,
        response_json_schema: {
          type: "object",
          properties: {
            ranked_ids: { type: "array", items: { type: "string" } }
          }
        }
      });

      const rankedIds = result?.ranked_ids;
      if (!rankedIds || rankedIds.length === 0) {
        toast.error("AI couldn't determine a sort order. Try again.");
        return;
      }

      // Build a lookup map for fast ordering
      const taskById = Object.fromEntries(tasks.map(t => [t.id, t]));
      const sorted = rankedIds
        .map(id => taskById[id])
        .filter(Boolean);

      // Append any tasks that AI missed (safety net)
      const sortedIds = new Set(rankedIds);
      tasks.forEach(t => { if (!sortedIds.has(t.id)) sorted.push(t); });

      onSorted(sorted);
      toast.success("Tasks re-ranked by AI based on urgency & impact.");
    } catch (err) {
      toast.error("Smart Sort failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSmartSorted) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={onReset}
        className="gap-2 text-indigo-600 border-indigo-200 bg-indigo-50 hover:bg-indigo-100"
      >
        <RotateCcw className="w-3.5 h-3.5" />
        Reset Order
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleSmartSort}
      disabled={isLoading || tasks.length === 0}
      className="gap-2 hover:border-indigo-300 hover:text-indigo-700"
    >
      {isLoading ? (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Ranking…
        </>
      ) : (
        <>
          <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
          Smart Sort
        </>
      )}
    </Button>
  );
}