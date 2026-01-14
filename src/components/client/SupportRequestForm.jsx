import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Wand2, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export default function SupportRequestForm() {
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    subject: "",
    description: "",
    priority: "medium",
    category: "technical",
    expected_outcome: ""
  });
  const [isImproving, setIsImproving] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const createRequestMutation = useMutation({
    mutationFn: (data) => base44.entities.SupportRequest.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(["supportRequests"]);
      setSubmitted(true);
      toast.success("Support request submitted successfully!");
    },
  });

  const handleImprove = async () => {
    if (!formData.description.trim()) return;
    
    setIsImproving(true);

    const prompt = `You are helping a customer write a clear support request.

CURRENT REQUEST:
Subject: ${formData.subject}
Description: ${formData.description}
Category: ${formData.category}
Expected outcome: ${formData.expected_outcome || "Not specified"}

TASK:
Improve this support request to make it:
1. Clear and specific
2. Include relevant details
3. Easy for support team to understand and act on
4. Professional but friendly tone

Respond in JSON format:
{
  "improved_subject": "A clear, specific subject line",
  "improved_description": "Enhanced description with structure and clarity",
  "improved_outcome": "Clear expected outcome",
  "tips": ["Tip 1", "Tip 2"] (suggestions for the customer)
}`;

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            improved_subject: { type: "string" },
            improved_description: { type: "string" },
            improved_outcome: { type: "string" },
            tips: { type: "array", items: { type: "string" } }
          }
        }
      });

      setFormData({
        ...formData,
        subject: result.improved_subject || formData.subject,
        description: result.improved_description || formData.description,
        expected_outcome: result.improved_outcome || formData.expected_outcome
      });

      if (result.tips?.length > 0) {
        toast.success("Request improved! Review the suggestions.");
      }
    } catch (error) {
      toast.error("Failed to improve request");
    } finally {
      setIsImproving(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.subject.trim() || !formData.description.trim()) {
      toast.error("Please fill in subject and description");
      return;
    }

    createRequestMutation.mutate({
      ...formData,
      customer_email: user?.email,
      customer_name: user?.full_name,
      status: "open",
      ai_assisted: true
    });
  };

  if (submitted) {
    return (
      <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 p-8 text-center">
        <div className="w-16 h-16 mx-auto rounded-full bg-green-100 flex items-center justify-center mb-4">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h3 className="text-xl font-bold text-green-900 mb-2">
          Request Submitted!
        </h3>
        <p className="text-sm text-green-700 mb-6">
          Our support team has received your request and will respond shortly.
        </p>
        <Button
          onClick={() => {
            setSubmitted(false);
            setFormData({
              subject: "",
              description: "",
              priority: "medium",
              category: "technical",
              expected_outcome: ""
            });
          }}
          variant="outline"
          className="border-green-600 text-green-700 hover:bg-green-50"
        >
          Submit Another Request
        </Button>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card className="bg-white shadow-lg border-0">
        <div className="p-6 space-y-4">
          {/* Category & Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-slate-700 mb-2 block">
                Category
              </Label>
              <Select
                value={formData.category}
                onValueChange={(v) => setFormData({ ...formData, category: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="technical">Technical Issue</SelectItem>
                  <SelectItem value="billing">Billing Question</SelectItem>
                  <SelectItem value="account">Account Help</SelectItem>
                  <SelectItem value="feature_request">Feature Request</SelectItem>
                  <SelectItem value="bug">Report a Bug</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium text-slate-700 mb-2 block">
                Priority
              </Label>
              <Select
                value={formData.priority}
                onValueChange={(v) => setFormData({ ...formData, priority: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Subject */}
          <div>
            <Label className="text-sm font-medium text-slate-700 mb-2 block">
              Subject
            </Label>
            <Input
              placeholder="Brief summary of your issue"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              required
            />
          </div>

          {/* Description */}
          <div>
            <Label className="text-sm font-medium text-slate-700 mb-2 block">
              Description
            </Label>
            <Textarea
              placeholder="Describe your issue in detail... What happened? What were you trying to do?"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="min-h-[150px]"
              required
            />
          </div>

          {/* Expected Outcome */}
          <div>
            <Label className="text-sm font-medium text-slate-700 mb-2 block">
              What outcome are you expecting?
            </Label>
            <Input
              placeholder="e.g., 'I want to be able to access my account' or 'Refund for duplicate charge'"
              value={formData.expected_outcome}
              onChange={(e) => setFormData({ ...formData, expected_outcome: e.target.value })}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={handleImprove}
            disabled={isImproving || !formData.description.trim()}
            className="text-violet-600 hover:text-violet-700 border-violet-200"
          >
            {isImproving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Improving...
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4 mr-2" />
                Improve with AI
              </>
            )}
          </Button>
          <Button
            type="submit"
            disabled={createRequestMutation.isPending}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          >
            {createRequestMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit Request"
            )}
          </Button>
        </div>
      </Card>
    </form>
  );
}