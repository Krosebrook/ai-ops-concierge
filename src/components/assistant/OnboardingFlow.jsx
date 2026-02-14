import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Sparkles, 
  MessageSquareText,
  FileEdit,
  Library,
  ClipboardList,
  Check,
  X,
  ArrowRight,
  ArrowLeft
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const ONBOARDING_STEPS = [
  {
    id: "welcome",
    title: "Welcome to AI Ops Concierge",
    description: "Your intelligent knowledge companion for operations, support, and more.",
    icon: Sparkles,
    content: "This platform helps you get instant answers from your knowledge base, draft professional communications, and manage tasks—all powered by AI."
  },
  {
    id: "ask_mode",
    title: "Ask Mode",
    description: "Get evidence-backed answers from your knowledge base",
    icon: MessageSquareText,
    content: "Ask any question about your processes, policies, or procedures. The AI will search your documents and Q&As to provide accurate answers with full citations.",
    cta: "Try asking a question",
    page: "Home"
  },
  {
    id: "drafts",
    title: "Draft Mode",
    description: "Create polished documents and communications",
    icon: FileEdit,
    content: "Generate professional emails, ticket responses, handoff notes, and meeting summaries. The AI adapts to your organization's tone and style.",
    cta: "Explore drafts",
    page: "Drafts"
  },
  {
    id: "knowledge_base",
    title: "Knowledge Base",
    description: "Manage your organizational knowledge",
    icon: Library,
    content: "Upload documents, create curated Q&As, and maintain your knowledge repository. The AI uses this content to provide accurate answers.",
    cta: "View knowledge base",
    page: "KnowledgeBase"
  },
  {
    id: "tasks",
    title: "Task Management",
    description: "Track actionable items from AI interactions",
    icon: ClipboardList,
    content: "When questions require escalation or follow-up, tasks are automatically created. Assign them to team members and track completion.",
    cta: "See tasks",
    page: "Tasks"
  }
];

export default function OnboardingFlow({ user }) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const queryClient = useQueryClient();

  const { data: onboarding } = useQuery({
    queryKey: ["onboarding", user?.id],
    queryFn: async () => {
      const records = await base44.entities.UserOnboarding.filter({ user_id: user.id });
      return records[0] || null;
    },
    enabled: !!user
  });

  const createOnboarding = useMutation({
    mutationFn: async () => {
      return base44.entities.UserOnboarding.create({
        user_id: user.id,
        completed_steps: [],
        current_step: "welcome",
        is_completed: false,
        dismissed: false,
        completion_percentage: 0
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboarding"] });
    }
  });

  const updateOnboarding = useMutation({
    mutationFn: async ({ stepId, isDismissed = false, isCompleted = false }) => {
      const completedSteps = [...(onboarding?.completed_steps || [])];
      if (stepId && !completedSteps.includes(stepId)) {
        completedSteps.push(stepId);
      }

      const percentage = (completedSteps.length / ONBOARDING_STEPS.length) * 100;

      return base44.entities.UserOnboarding.update(onboarding.id, {
        completed_steps: completedSteps,
        current_step: ONBOARDING_STEPS[currentStepIndex + 1]?.id || "completed",
        dismissed: isDismissed,
        is_completed: isCompleted || completedSteps.length === ONBOARDING_STEPS.length,
        completion_percentage: percentage
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboarding"] });
    }
  });

  useEffect(() => {
    if (user && !onboarding && !createOnboarding.isPending) {
      createOnboarding.mutate();
    }
  }, [user, onboarding]);

  if (!onboarding || onboarding.dismissed || onboarding.is_completed) {
    return null;
  }

  const currentStep = ONBOARDING_STEPS[currentStepIndex];
  const Icon = currentStep.icon;
  const progress = ((currentStepIndex + 1) / ONBOARDING_STEPS.length) * 100;

  const handleNext = () => {
    updateOnboarding.mutate({ 
      stepId: currentStep.id,
      isCompleted: currentStepIndex === ONBOARDING_STEPS.length - 1
    });
    
    if (currentStepIndex < ONBOARDING_STEPS.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      toast.success("Onboarding complete! 🎉");
    }
  };

  const handleDismiss = () => {
    updateOnboarding.mutate({ isDismissed: true });
    toast.info("You can restart onboarding from Settings");
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-2xl">
        <div className="p-8 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <Badge variant="secondary">
              Step {currentStepIndex + 1} of {ONBOARDING_STEPS.length}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDismiss}
              className="h-8 w-8"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Progress */}
          <Progress value={progress} className="h-2" />

          {/* Content */}
          <div className="space-y-4 text-center">
            <div className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50">
              <Icon className="w-12 h-12 text-indigo-600" />
            </div>
            
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {currentStep.title}
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                {currentStep.description}
              </p>
              <p className="text-base text-gray-700 leading-relaxed">
                {currentStep.content}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4">
            <Button
              variant="ghost"
              onClick={() => setCurrentStepIndex(Math.max(0, currentStepIndex - 1))}
              disabled={currentStepIndex === 0}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            
            <Button
              onClick={handleNext}
              className="gap-2"
            >
              {currentStepIndex === ONBOARDING_STEPS.length - 1 ? (
                <>
                  <Check className="w-4 h-4" />
                  Finish
                </>
              ) : (
                <>
                  {currentStep.cta || "Next"}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>

          {/* Step indicators */}
          <div className="flex justify-center gap-2 pt-4">
            {ONBOARDING_STEPS.map((step, idx) => (
              <button
                key={step.id}
                onClick={() => setCurrentStepIndex(idx)}
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  idx === currentStepIndex 
                    ? "bg-indigo-600 w-8" 
                    : idx < currentStepIndex
                    ? "bg-green-500"
                    : "bg-gray-300"
                )}
              />
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}