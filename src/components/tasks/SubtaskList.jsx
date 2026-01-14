import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function SubtaskList({ parentTaskId }) {
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const queryClient = useQueryClient();

  const { data: subtasks = [] } = useQuery({
    queryKey: ["subtasks", parentTaskId],
    queryFn: () => base44.entities.Task.filter({ parent_task_id: parentTaskId }),
  });

  const createMutation = useMutation({
    mutationFn: (title) =>
      base44.entities.Task.create({
        title,
        status: "open",
        priority: "medium",
        parent_task_id: parentTaskId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subtasks", parentTaskId] });
      setNewSubtaskTitle("");
      toast.success("Subtask created");
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) =>
      base44.entities.Task.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subtasks", parentTaskId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Task.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subtasks", parentTaskId] });
      toast.success("Subtask deleted");
    },
  });

  const completedCount = subtasks.filter(s => s.status === "completed").length;
  const percentage = subtasks.length > 0 ? Math.round((completedCount / subtasks.length) * 100) : 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-700">Subtasks</span>
          <Badge variant="outline">{completedCount}/{subtasks.length}</Badge>
        </div>
        <div className="w-24 h-1.5 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 transition-all"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      <div className="space-y-2">
        {subtasks.map(subtask => (
          <div
            key={subtask.id}
            className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg group"
          >
            <button
              onClick={() =>
                updateStatusMutation.mutate({
                  id: subtask.id,
                  status: subtask.status === "completed" ? "open" : "completed",
                })
              }
              className="flex-shrink-0 transition-colors"
            >
              {subtask.status === "completed" ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              ) : (
                <Circle className="w-5 h-5 text-slate-400 hover:text-slate-600" />
              )}
            </button>
            <span
              className={cn(
                "flex-1 text-sm",
                subtask.status === "completed" && "line-through text-slate-400"
              )}
            >
              {subtask.title}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="w-6 h-6 opacity-0 group-hover:opacity-100"
              onClick={() => deleteMutation.mutate(subtask.id)}
            >
              <Trash2 className="w-3 h-3 text-red-500" />
            </Button>
          </div>
        ))}
      </div>

      <div className="flex gap-2 pt-2">
        <Input
          placeholder="Add subtask..."
          value={newSubtaskTitle}
          onChange={(e) => setNewSubtaskTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && newSubtaskTitle.trim()) {
              createMutation.mutate(newSubtaskTitle);
            }
          }}
          className="text-sm h-8"
        />
        <Button
          size="icon"
          className="h-8 w-8"
          onClick={() =>
            newSubtaskTitle.trim() && createMutation.mutate(newSubtaskTitle)
          }
        >
          <Plus className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}