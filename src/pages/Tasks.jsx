import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  CheckCircle2,
  Circle,
  Clock,
  User,
  Search,
  Filter,
  Plus,
  Calendar,
  AlertCircle,
  Play,
  X,
  Loader2,
  ListTodo,
  ExternalLink,
  Repeat2,
  Link as LinkIcon,
  ChevronDown,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

const STATUS_CONFIG = {
  open: { icon: Circle, color: "text-slate-400", bg: "bg-slate-100", label: "Open" },
  in_progress: { icon: Play, color: "text-blue-600", bg: "bg-blue-100", label: "In Progress" },
  completed: { icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-100", label: "Completed" },
  cancelled: { icon: X, color: "text-red-600", bg: "bg-red-100", label: "Cancelled" }
};

const PRIORITY_CONFIG = {
  low: { color: "text-slate-600", bg: "bg-slate-100" },
  medium: { color: "text-blue-600", bg: "bg-blue-100" },
  high: { color: "text-orange-600", bg: "bg-orange-100" },
  urgent: { color: "text-red-600", bg: "bg-red-100" }
};

export default function Tasks() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [user, setUser] = useState(null);

  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => base44.entities.Task.list("-created_date"),
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
  });

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch = !searchQuery || 
      task.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "all" || task.status === filterStatus;
    const matchesPriority = filterPriority === "all" || task.priority === filterPriority;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const tasksByStatus = {
    open: filteredTasks.filter(t => t.status === "open"),
    in_progress: filteredTasks.filter(t => t.status === "in_progress"),
    completed: filteredTasks.filter(t => t.status === "completed"),
    cancelled: filteredTasks.filter(t => t.status === "cancelled")
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 text-blue-600 text-sm font-medium mb-4">
            <ListTodo className="w-4 h-4" />
            <span>Tasks</span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight">
            Task Management
          </h1>
          <p className="mt-2 text-slate-600">
            Track and manage tasks created from AI insights and escalations.
          </p>
        </div>
        <Button
          onClick={() => setShowCreateDialog(true)}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Task
        </Button>
      </div>

      {/* Filters */}
      <Card className="bg-white border-0 shadow-sm mb-6">
        <div className="p-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {filteredTasks.length !== tasks.length && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Filter className="w-3 h-3" />
              <span>Showing {filteredTasks.length} of {tasks.length} tasks</span>
            </div>
          )}
        </div>
      </Card>

      {/* Task Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {Object.entries(STATUS_CONFIG).map(([status, config]) => (
          <Card key={status} className="p-4 bg-white border-0 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">{config.label}</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {tasksByStatus[status]?.length || 0}
                </p>
              </div>
              <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", config.bg)}>
                <config.icon className={cn("w-5 h-5", config.color)} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Tasks Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      ) : filteredTasks.length === 0 ? (
        <Card className="bg-white border-0 shadow-sm">
          <div className="text-center py-16">
            <ListTodo className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-700">No tasks found</h3>
            <p className="text-sm text-slate-500 mt-1">
              Create your first task or convert an AI event from the audit log.
            </p>
            <Button onClick={() => setShowCreateDialog(true)} className="mt-4">
              <Plus className="w-4 h-4 mr-2" />
              Create Task
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredTasks.map((task) => (
            <TaskCard 
              key={task.id} 
              task={task} 
              users={users}
              onSelect={setSelectedTask}
              queryClient={queryClient}
            />
          ))}
        </div>
      )}

      {/* Create Task Dialog */}
      <CreateTaskDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        user={user}
        users={users}
        queryClient={queryClient}
      />

      {/* Task Detail Dialog */}
      <TaskDetailDialog
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        users={users}
        queryClient={queryClient}
      />
    </div>
  );
}

function TaskCard({ task, users, onSelect, queryClient }) {
  const statusConfig = STATUS_CONFIG[task.status];
  const priorityConfig = PRIORITY_CONFIG[task.priority];
  const StatusIcon = statusConfig.icon;

  const assignedUser = users.find(u => u.id === task.assigned_user_id);

  const updateStatusMutation = useMutation({
    mutationFn: (newStatus) => base44.entities.Task.update(task.id, { status: newStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries(["tasks"]);
      toast.success("Task status updated");
    }
  });

  return (
    <Card 
      className="bg-white hover:shadow-md transition-shadow cursor-pointer group"
      onClick={() => onSelect(task)}
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 flex-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                const nextStatus = task.status === "open" ? "in_progress" : 
                                   task.status === "in_progress" ? "completed" : "open";
                updateStatusMutation.mutate(nextStatus);
              }}
              className={cn("w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                task.status === "completed" ? "border-emerald-500 bg-emerald-500" : "border-slate-300 hover:border-slate-400"
              )}
            >
              {task.status === "completed" && <CheckCircle2 className="w-4 h-4 text-white" />}
            </button>
            <div className="flex-1 min-w-0">
              <h3 className={cn(
                "font-semibold text-slate-800 line-clamp-2",
                task.status === "completed" && "line-through text-slate-500"
              )}>
                {task.title}
              </h3>
            </div>
          </div>
          <Badge className={cn("text-xs", priorityConfig.color, priorityConfig.bg)}>
            {task.priority}
          </Badge>
        </div>

        {task.description && (
          <p className="text-sm text-slate-600 line-clamp-2 mb-4">
            {task.description}
          </p>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <Badge variant="outline" className={cn("gap-1", statusConfig.bg, statusConfig.color)}>
              <StatusIcon className="w-3 h-3" />
              {statusConfig.label}
            </Badge>
            {task.assigned_team && (
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {assignedUser?.full_name || task.assigned_team}
              </span>
            )}
          </div>
          {task.event_id && (
            <Badge variant="outline" className="text-xs gap-1">
              <AlertCircle className="w-3 h-3" />
              From AI
            </Badge>
          )}
        </div>
      </div>
    </Card>
  );
}

function CreateTaskDialog({ open, onOpenChange, user, users, queryClient }) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    assigned_team: "",
    assigned_user_id: "",
    priority: "medium",
    status: "open"
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!formData.title.trim()) return;
    
    setIsSubmitting(true);
    try {
      await base44.entities.Task.create(formData);
      queryClient.invalidateQueries(["tasks"]);
      toast.success("Task created successfully");
      onOpenChange(false);
      setFormData({
        title: "",
        description: "",
        assigned_team: "",
        assigned_user_id: "",
        priority: "medium",
        status: "open"
      });
    } catch (error) {
      toast.error("Failed to create task");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">
              Title *
            </label>
            <Input
              placeholder="e.g., Review enterprise onboarding process"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">
              Description
            </label>
            <Input
              placeholder="Provide task details..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Priority
              </label>
              <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Assign To
              </label>
              <Select value={formData.assigned_user_id} onValueChange={(v) => setFormData({ ...formData, assigned_user_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.full_name || u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !formData.title.trim()}>
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Task"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TaskDetailDialog({ task, onClose, users, queryClient }) {
  if (!task) return null;

  const statusConfig = STATUS_CONFIG[task.status];
  const assignedUser = users.find(u => u.id === task.assigned_user_id);

  const updateStatusMutation = useMutation({
    mutationFn: (newStatus) => base44.entities.Task.update(task.id, { status: newStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries(["tasks"]);
      toast.success("Task updated");
    }
  });

  return (
    <Dialog open={!!task} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <statusConfig.icon className={cn("w-5 h-5", statusConfig.color)} />
            <span>{task.title}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Meta */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl">
            <div>
              <p className="text-xs text-slate-500 mb-1">Status</p>
              <Select value={task.status} onValueChange={(v) => updateStatusMutation.mutate(v)}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Priority</p>
              <p className="text-sm font-medium text-slate-700 capitalize">{task.priority}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Assigned To</p>
              <p className="text-sm font-medium text-slate-700">
                {assignedUser?.full_name || task.assigned_team || "Unassigned"}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Created</p>
              <p className="text-sm font-medium text-slate-700">
                {format(new Date(task.created_date), "MMM d, yyyy")}
              </p>
            </div>
          </div>

          {/* Description */}
          {task.description && (
            <div>
              <h4 className="text-sm font-semibold text-slate-700 mb-2">Description</h4>
              <p className="text-sm text-slate-600">{task.description}</p>
            </div>
          )}

          {/* AI Answer */}
          {task.ai_answer && (
            <div>
              <h4 className="text-sm font-semibold text-slate-700 mb-2">AI Context</h4>
              <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-100">
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{task.ai_answer}</p>
              </div>
            </div>
          )}

          {/* Citations */}
          {task.citations?.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-slate-700 mb-2">References</h4>
              <div className="space-y-2">
                {task.citations.map((citation, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-lg text-sm text-slate-600">
                    {citation}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Event Link */}
          {task.event_id && (
            <div className="pt-4 border-t border-slate-100">
              <p className="text-xs text-slate-500 flex items-center gap-2">
                <AlertCircle className="w-3 h-3" />
                Created from AI Event: {task.event_id}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}