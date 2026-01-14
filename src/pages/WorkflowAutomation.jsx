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
  Plus,
  Zap,
  Trash2,
  Edit,
  Power,
  Loader2,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";

const TRIGGER_TYPES = [
  { value: "ai_event_flag", label: "AI Event Flag", description: "When AI event has specific flag" },
  { value: "support_request_category", label: "Support Category", description: "When support request is created" },
  { value: "event_confidence", label: "Low Confidence", description: "When AI confidence is low" }
];

const TRIGGER_VALUES = {
  ai_event_flag: ["potential_customer_interest", "billing_issue", "technical_problem", "urgent"],
  support_request_category: ["technical", "billing", "account", "feature_request", "bug"],
  event_confidence: ["low"]
};

export default function WorkflowAutomation() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedRule, setSelectedRule] = useState(null);
  const [user, setUser] = useState(null);

  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ["workflowRules"],
    queryFn: () => base44.entities.WorkflowRule.list("-created_date"),
  });

  const deleteRuleMutation = useMutation({
    mutationFn: (ruleId) => base44.entities.WorkflowRule.delete(ruleId),
    onSuccess: () => {
      queryClient.invalidateQueries(["workflowRules"]);
      toast.success("Rule deleted");
    }
  });

  const toggleRuleMutation = useMutation({
    mutationFn: (rule) => base44.entities.WorkflowRule.update(rule.id, { enabled: !rule.enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries(["workflowRules"]);
      toast.success(`Rule ${!selectedRule?.enabled ? "enabled" : "disabled"}`);
    }
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-50 text-purple-600 text-sm font-medium mb-4">
            <Zap className="w-4 h-4" />
            <span>Workflow Automation</span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight">
            Automation Rules
          </h1>
          <p className="mt-2 text-slate-600">
            Define rules to automatically convert AI events into tasks.
          </p>
        </div>
        <Button
          onClick={() => setShowCreateDialog(true)}
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Rule
        </Button>
      </div>

      {/* Rules List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      ) : rules.length === 0 ? (
        <Card className="p-12 text-center bg-white border-0 shadow-sm">
          <Zap className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-700">No automation rules yet</h3>
          <p className="text-sm text-slate-500 mt-1">Create your first rule to automate task creation.</p>
          <Button onClick={() => setShowCreateDialog(true)} className="mt-4">
            <Plus className="w-4 h-4 mr-2" />
            Create Rule
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <RuleCard
              key={rule.id}
              rule={rule}
              onToggle={() => toggleRuleMutation.mutate(rule)}
              onEdit={() => setSelectedRule(rule)}
              onDelete={() => deleteRuleMutation.mutate(rule.id)}
            />
          ))}
        </div>
      )}

      {/* Create Rule Dialog */}
      <CreateRuleDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        user={user}
        queryClient={queryClient}
      />
    </div>
  );
}

function RuleCard({ rule, onToggle, onEdit, onDelete }) {
  const triggerConfig = TRIGGER_TYPES.find(t => t.value === rule.trigger_type);

  return (
    <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-semibold text-slate-800">{rule.name}</h3>
            <Badge variant={rule.enabled ? "default" : "outline"} className="text-xs">
              {rule.enabled ? "Active" : "Inactive"}
            </Badge>
          </div>
          <p className="text-sm text-slate-600 mb-3">{rule.description}</p>

          {/* Rule Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-3 bg-slate-50 rounded-lg">
            <div>
              <p className="text-xs text-slate-500 mb-1">Trigger</p>
              <p className="text-sm font-medium text-slate-700">{triggerConfig?.label}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Trigger Value</p>
              <p className="text-sm font-medium text-slate-700 capitalize">{rule.trigger_value}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Assigned To</p>
              <p className="text-sm font-medium text-slate-700">{rule.action_config?.assigned_team}</p>
            </div>
          </div>

          {/* Action Config */}
          <div className="text-xs text-slate-600 space-y-1">
            <p>
              <strong>Action:</strong> Create {rule.action_config?.task_priority} priority task
            </p>
            <p>
              <strong>Title Template:</strong> {rule.action_config?.task_title_template}
            </p>
            <p className="text-slate-500 mt-2">
              Executed {rule.execution_count || 0} times
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant="outline"
            size="icon"
            onClick={onToggle}
            className="h-8 w-8"
            title={rule.enabled ? "Disable" : "Enable"}
          >
            <Power className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={onEdit}
            className="h-8 w-8"
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={onDelete}
            className="h-8 w-8 text-red-600 hover:text-red-700"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

function CreateRuleDialog({ open, onOpenChange, user, queryClient }) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    trigger_type: "",
    trigger_value: "",
    action: "create_task",
    action_config: {
      task_priority: "high",
      assigned_team: "",
      task_title_template: "Auto: {trigger_value}"
    }
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createRuleMutation = useMutation({
    mutationFn: (ruleData) => base44.entities.WorkflowRule.create(ruleData),
    onSuccess: () => {
      queryClient.invalidateQueries(["workflowRules"]);
      toast.success("Automation rule created");
      onOpenChange(false);
      setFormData({
        name: "",
        description: "",
        trigger_type: "",
        trigger_value: "",
        action: "create_task",
        action_config: {
          task_priority: "high",
          assigned_team: "",
          task_title_template: "Auto: {trigger_value}"
        }
      });
    },
    onError: () => {
      toast.error("Failed to create rule");
    }
  });

  const handleSubmit = () => {
    if (!formData.name.trim() || !formData.trigger_type || !formData.trigger_value) {
      toast.error("Please fill in all required fields");
      return;
    }

    createRuleMutation.mutate({
      ...formData,
      created_by: user?.id,
      enabled: true
    });
  };

  const triggerValues = formData.trigger_type ? TRIGGER_VALUES[formData.trigger_type] : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Automation Rule</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Rule Name */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">
              Rule Name *
            </label>
            <Input
              placeholder="e.g., Convert customer interest events to sales tasks"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">
              Description
            </label>
            <Input
              placeholder="What does this rule do?"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          {/* Trigger Type */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">
              Trigger Type *
            </label>
            <Select value={formData.trigger_type} onValueChange={(v) => 
              setFormData({ ...formData, trigger_type: v, trigger_value: "" })
            }>
              <SelectTrigger>
                <SelectValue placeholder="Select trigger type" />
              </SelectTrigger>
              <SelectContent>
                {TRIGGER_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Trigger Value */}
          {triggerValues.length > 0 && (
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Trigger Value *
              </label>
              <Select value={formData.trigger_value} onValueChange={(v) =>
                setFormData({ ...formData, trigger_value: v })
              }>
                <SelectTrigger>
                  <SelectValue placeholder="Select value" />
                </SelectTrigger>
                <SelectContent>
                  {triggerValues.map((val) => (
                    <SelectItem key={val} value={val}>
                      {val.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Task Priority */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">
              Task Priority
            </label>
            <Select 
              value={formData.action_config.task_priority}
              onValueChange={(v) => setFormData({
                ...formData,
                action_config: { ...formData.action_config, task_priority: v }
              })}
            >
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

          {/* Assigned Team */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">
              Assign to Team *
            </label>
            <Input
              placeholder="e.g., Sales, Support, Engineering"
              value={formData.action_config.assigned_team}
              onChange={(e) => setFormData({
                ...formData,
                action_config: { ...formData.action_config, assigned_team: e.target.value }
              })}
            />
          </div>

          {/* Title Template */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">
              Task Title Template
            </label>
            <Input
              placeholder="e.g., Auto: {trigger_value}"
              value={formData.action_config.task_title_template}
              onChange={(e) => setFormData({
                ...formData,
                action_config: { ...formData.action_config, task_title_template: e.target.value }
              })}
            />
            <p className="text-xs text-slate-500 mt-1">
              Use {"{trigger_value}"} as placeholder for the trigger value
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={createRuleMutation.isPending}>
            {createRuleMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Rule"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}