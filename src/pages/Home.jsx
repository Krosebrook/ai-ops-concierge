import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Send, 
  Loader2, 
  Sparkles, 
  ArrowRight, 
  ThumbsUp, 
  ThumbsDown,
  Copy,
  RotateCcw,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  BookOpen
} from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import ConfidenceBadge from "@/components/ui/ConfidenceBadge";
import CitationCard from "@/components/ui/CitationCard";
import PolicyFlag from "@/components/ui/PolicyFlag";
import { toast } from "sonner";

const contextOptions = {
  urgency: ["Low", "Medium", "High", "Critical"],
  product: ["Platform Core", "API Services", "Integrations", "Mobile App"],
  customer_type: ["Enterprise", "SMB", "Self-Serve", "Internal"]
};

export default function Home() {
  const [question, setQuestion] = useState("");
  const [context, setContext] = useState({ urgency: "", product: "", customer_type: "" });
  const [showContext, setShowContext] = useState(false);
  const [response, setResponse] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [currentEventId, setCurrentEventId] = useState(null);
  const textareaRef = useRef(null);
  
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: documents = [] } = useQuery({
    queryKey: ["documents", "active"],
    queryFn: () => base44.entities.Document.filter({ status: "active" }),
  });

  const { data: curatedQAs = [] } = useQuery({
    queryKey: ["curatedQAs", "approved"],
    queryFn: () => base44.entities.CuratedQA.filter({ status: "approved" }),
  });

  const handleAsk = async () => {
    if (!question.trim()) return;
    
    setIsLoading(true);
    setResponse(null);

    const knowledgeContext = [
      ...documents.slice(0, 10).map(d => `[DOC: ${d.title}]\n${d.content?.slice(0, 500) || ""}`),
      ...curatedQAs.slice(0, 10).map(qa => `[Q&A]\nQ: ${qa.question}\nA: ${qa.answer}`)
    ].join("\n\n---\n\n");

    const prompt = `You are an AI Ops Concierge helping internal teams find answers with evidence.

KNOWLEDGE BASE:
${knowledgeContext || "No documents available yet."}

USER QUESTION: ${question}

CONTEXT: ${JSON.stringify(context)}

INSTRUCTIONS:
1. Answer the question using ONLY the knowledge base above
2. If you find relevant information, cite the source document or Q&A
3. Provide clear, actionable steps when applicable
4. If you cannot find sufficient information, clearly state this and suggest next steps
5. Flag any potential policy concerns (PII, internal-only info, etc.)

Respond in JSON format:
{
  "answer": "Your detailed answer here with clear formatting",
  "citations": [{"title": "Document/Q&A title", "section": "Relevant section", "score": 0.0-1.0}],
  "confidence": "high" | "medium" | "low",
  "flags": ["pii_warning", "internal_only", "needs_review"] (empty if none),
  "next_steps": ["Step 1", "Step 2"],
  "escalation": {"target": "Team/Role if needed", "reason": "Why"} or null
}`;

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            answer: { type: "string" },
            citations: { 
              type: "array", 
              items: { 
                type: "object",
                properties: {
                  title: { type: "string" },
                  section: { type: "string" },
                  score: { type: "number" }
                }
              } 
            },
            confidence: { type: "string" },
            flags: { type: "array", items: { type: "string" } },
            next_steps: { type: "array", items: { type: "string" } },
            escalation: { 
              type: "object",
              properties: {
                target: { type: "string" },
                reason: { type: "string" }
              }
            }
          }
        }
      });

      setResponse(result);

      // Log the AI event
      const eventRecord = await base44.entities.AIEvent.create({
        user_id: user?.id,
        user_email: user?.email,
        user_role: user?.role,
        mode: "ask",
        input: question,
        context_json: JSON.stringify(context),
        output: result.answer,
        confidence: result.confidence,
        flags: result.flags || [],
        sources: result.citations?.map(c => ({
          document_title: c.title,
          section: c.section,
          score: c.score
        })) || [],
        escalation_target: result.escalation?.target,
        escalation_reason: result.escalation?.reason
      });
      
      setCurrentEventId(eventRecord.id);
      
      // Auto-create task if escalation recommended
      if (result.escalation?.target) {
        try {
          await base44.entities.Task.create({
            title: question.slice(0, 100),
            description: `Escalation: ${result.escalation.reason}`,
            event_id: eventRecord.id,
            assigned_team: result.escalation.target,
            status: "open",
            priority: "high",
            ai_answer: result.answer,
            citations: result.citations?.map(c => c.title) || []
          });
          queryClient.invalidateQueries(["tasks"]);
          toast.success("Task created from escalation");
        } catch (error) {
          console.error("Failed to auto-create task:", error);
        }
      }

    } catch (error) {
      toast.error("Failed to get response. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFeedback = async (rating) => {
    if (!response) return;
    toast.success(`Feedback recorded: ${rating === "up" ? "Helpful" : "Not helpful"}`);
  };

  const copyToClipboard = () => {
    if (response?.answer) {
      navigator.clipboard.writeText(response.answer);
      toast.success("Copied to clipboard");
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-600 text-sm font-medium mb-4">
          <Sparkles className="w-4 h-4" />
          <span>Ask Mode</span>
        </div>
        <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight">
          How can I help you today?
        </h1>
        <p className="mt-3 text-slate-600 max-w-xl mx-auto">
          Get answers grounded in your team's knowledge base with full citations and evidence.
        </p>
      </div>

      {/* Question Input */}
      <Card className="bg-white shadow-xl shadow-slate-200/50 border-0 overflow-hidden">
        <div className="p-6">
          <Textarea
            ref={textareaRef}
            placeholder="Ask a question... (e.g., 'How do we handle refund requests for enterprise customers?')"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="min-h-[120px] text-base border-0 focus-visible:ring-0 resize-none p-0 placeholder:text-slate-400"
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.metaKey) {
                handleAsk();
              }
            }}
          />
        </div>

        {/* Context Section */}
        <div className="border-t border-slate-100">
          <button
            onClick={() => setShowContext(!showContext)}
            className="flex items-center justify-between w-full px-6 py-3 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <span className="font-medium">Add context (optional)</span>
            {showContext ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          
          {showContext && (
            <div className="px-6 pb-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {Object.entries(contextOptions).map(([key, options]) => (
                <Select
                  key={key}
                  value={context[key]}
                  onValueChange={(value) => setContext({ ...context, [key]: value })}
                >
                  <SelectTrigger className="bg-slate-50 border-slate-200">
                    <SelectValue placeholder={key.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())} />
                  </SelectTrigger>
                  <SelectContent>
                    {options.map((opt) => (
                      <SelectItem key={opt} value={opt.toLowerCase()}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ))}
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            ⌘ + Enter to submit
          </span>
          <Button
            onClick={handleAsk}
            disabled={!question.trim() || isLoading}
            className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 shadow-lg shadow-indigo-200/50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Thinking...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Ask
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Response Section */}
      {response && (
        <div className="mt-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Confidence & Flags */}
          <div className="flex flex-wrap items-center gap-3">
            <ConfidenceBadge level={response.confidence} />
            {response.flags?.map((flag) => (
              <PolicyFlag key={flag} type={flag} compact />
            ))}
          </div>

          {/* Answer */}
          <Card className="bg-white border-0 shadow-lg shadow-slate-100/50 overflow-hidden">
            <div className="p-6">
              <div className="prose prose-slate prose-sm max-w-none">
                <ReactMarkdown>{response.answer}</ReactMarkdown>
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 py-3 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleFeedback("up")}
                  className="text-slate-500 hover:text-emerald-600"
                >
                  <ThumbsUp className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleFeedback("down")}
                  className="text-slate-500 hover:text-rose-600"
                >
                  <ThumbsDown className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyToClipboard}
                  className="text-slate-500"
                >
                  <Copy className="w-4 h-4 mr-1" />
                  Copy
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setResponse(null); setQuestion(""); }}
                  className="text-slate-500"
                >
                  <RotateCcw className="w-4 h-4 mr-1" />
                  New
                </Button>
              </div>
            </div>
          </Card>

          {/* Citations */}
          {response.citations?.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Sources ({response.citations.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {response.citations.map((citation, idx) => (
                  <CitationCard
                    key={idx}
                    title={citation.title}
                    section={citation.section}
                    score={citation.score}
                    onClick={() => toast.info(`Viewing: ${citation.title}`)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Next Steps */}
          {response.next_steps?.length > 0 && (
            <Card className="bg-gradient-to-br from-indigo-50 to-violet-50 border-indigo-100">
              <div className="p-5">
                <h3 className="text-sm font-semibold text-indigo-900 mb-3">
                  Recommended Next Steps
                </h3>
                <ul className="space-y-2">
                  {response.next_steps.map((step, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-indigo-800">
                      <ArrowRight className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          )}

          {/* Escalation */}
          {response.escalation && (
            <Card className="bg-amber-50 border-amber-200">
              <div className="p-5">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-semibold text-amber-900">
                      Escalation Recommended
                    </h3>
                    <p className="text-sm text-amber-800 mt-1">
                      <strong>Target:</strong> {response.escalation.target}
                    </p>
                    <p className="text-sm text-amber-700 mt-1">
                      {response.escalation.reason}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3 border-amber-300 text-amber-800 hover:bg-amber-100"
                    >
                      Create Escalation Task
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Empty State */}
      {!response && !isLoading && (
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { title: "Process Questions", example: "How do we handle enterprise refunds?" },
            { title: "Policy Lookup", example: "What's our SLA for critical tickets?" },
            { title: "Troubleshooting", example: "Steps to resolve API auth failures?" },
          ].map((item, idx) => (
            <button
              key={idx}
              onClick={() => setQuestion(item.example)}
              className="text-left p-4 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 hover:shadow-md hover:shadow-indigo-100/50 transition-all duration-200 group"
            >
              <p className="text-sm font-medium text-slate-700 group-hover:text-indigo-700">
                {item.title}
              </p>
              <p className="text-xs text-slate-500 mt-1 italic">
                "{item.example}"
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}