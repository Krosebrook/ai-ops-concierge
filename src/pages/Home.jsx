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
  AlertTriangle,
  Search,
  CheckCircle2,
  FileText,
  Clock
} from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import ConfidenceBadge from "@/components/ui/ConfidenceBadge";
import CitationCard from "@/components/ui/CitationCard";
import PolicyFlag from "@/components/ui/PolicyFlag";
import DocumentUploader from "@/components/common/DocumentUploader";
import { toast } from "sonner";

const contextOptions = {
  urgency: ["Low", "Medium", "High", "Critical"],
  product: ["Platform Core", "API Services", "Integrations", "Mobile App"],
  customer_type: ["Enterprise", "SMB", "Self-Serve", "Internal"]
};

export default function Home() {
  const [question, setQuestion] = useState("");
  const [context, setContext] = useState({ urgency: "", product: "", customer_type: "" });
  const [response, setResponse] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState("");
  const [confidencePreview, setConfidencePreview] = useState(null);
  const [showFullAnswer, setShowFullAnswer] = useState(false);
  const [user, setUser] = useState(null);
  const [currentEventId, setCurrentEventId] = useState(null);
  const [uploadedDocs, setUploadedDocs] = useState([]);
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

  const trackDocumentView = async (docId, docTitle) => {
    try {
      await base44.entities.DocumentView.create({
        document_id: docId,
        document_title: docTitle,
        user_id: user?.id,
        user_email: user?.email,
        source: 'citation'
      });
    } catch (error) {
      console.error('Failed to track view:', error);
    }
  };

  const handleAsk = async () => {
    if (!question.trim()) return;
    
    setIsLoading(true);
    setResponse(null);
    setConfidencePreview(null);
    setShowFullAnswer(false);
    setLoadingStage("Searching knowledge base...");

    // Build knowledge context with documents filtered by user role
    const roleFilteredDocs = user?.role === "admin" 
      ? documents 
      : documents.filter(d => !d.tags?.includes("internal_only"));
    
    const knowledgeContext = [
      ...uploadedDocs.slice(0, 5).map(d => `[UPLOADED: ${d.name}]\n${d.content?.slice(0, 300) || ""}`),
      ...roleFilteredDocs.slice(0, 10).map(d => {
        const source = d.is_external ? `EXTERNAL${d.external_url ? ` (${d.external_url})` : ''}` : 'INTERNAL';
        return `[DOC - ${source}: ${d.title}]\n${d.content?.slice(0, 500) || ""}`;
      }),
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
      setLoadingStage("Analyzing sources...");
      
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

      setLoadingStage("Generating answer...");
      
      // Process answer with inline citations
      const processedAnswer = processAnswerWithCitations(result.answer, result.citations);
      result.processedAnswer = processedAnswer;
      
      // Show confidence preview first
      setConfidencePreview({
        confidence: result.confidence,
        sourceCount: result.citations?.length || 0,
        hasFlags: result.flags?.length > 0
      });
      
      // Auto-expand high confidence, require confirmation for low
      if (result.confidence === "high") {
        setTimeout(() => {
          setResponse(result);
          setShowFullAnswer(true);
        }, 800);
      } else {
        setResponse(result);
      }

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

  const processAnswerWithCitations = (answer, citations) => {
    if (!citations || citations.length === 0) return answer;
    
    // Simple citation insertion - add superscript numbers
    let processed = answer;
    citations.forEach((citation, idx) => {
      // Find mentions of the citation title and add superscript
      const citationNum = idx + 1;
      processed = processed.replace(
        new RegExp(citation.title.split(' ').slice(0, 3).join(' '), 'gi'),
        `$& [${citationNum}]`
      );
    });
    return processed;
  };

  const copyToClipboard = () => {
    if (response?.answer) {
      navigator.clipboard.writeText(response.answer);
      toast.success("Answer copied");
    }
  };

  const getConfidenceColor = (level) => {
    switch(level) {
      case "high": return { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-900", badge: "bg-emerald-100 text-emerald-800" };
      case "medium": return { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-900", badge: "bg-amber-100 text-amber-800" };
      case "low": return { bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-900", badge: "bg-rose-100 text-rose-800" };
      default: return { bg: "bg-gray-50", border: "border-gray-200", text: "text-gray-900", badge: "bg-gray-100 text-gray-800" };
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Ask a Question
        </h1>
        <p className="text-gray-600">
          Get evidence-backed answers from your knowledge base
        </p>
      </div>

      {/* Question Input */}
      <Card className="bg-white shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 space-y-4">
          <Textarea
            ref={textareaRef}
            placeholder="e.g., How do we handle enterprise refund requests?"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="min-h-[100px] text-lg leading-relaxed border-0 focus-visible:ring-0 resize-none p-0 placeholder:text-gray-400"
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.metaKey) {
                handleAsk();
              }
            }}
          />
          
          {/* Persistent Context (simplified) */}
          <div className="flex gap-2">
            {Object.entries(contextOptions).map(([key, options]) => (
              <Select
                key={key}
                value={context[key]}
                onValueChange={(value) => setContext({ ...context, [key]: value })}
              >
                <SelectTrigger className="text-sm bg-gray-50 border-gray-200">
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

          <DocumentUploader
            onDocumentsAdd={setUploadedDocs}
            maxFiles={3}
          />
        </div>

        {/* Submit */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-3">
          <Button
            onClick={handleAsk}
            disabled={!question.trim() || isLoading}
            size="lg"
            className="bg-gray-900 hover:bg-gray-800"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {loadingStage}
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Ask Question
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Confidence Preview (Loading State) */}
      {confidencePreview && !showFullAnswer && (
        <Card className={cn(
          "mt-6 shadow-md border transition-all",
          getConfidenceColor(confidencePreview.confidence).bg,
          getConfidenceColor(confidencePreview.confidence).border
        )}>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "px-3 py-1 rounded-full text-sm font-medium",
                  getConfidenceColor(confidencePreview.confidence).badge
                )}>
                  {confidencePreview.confidence.toUpperCase()} CONFIDENCE
                </div>
                <span className="text-sm text-gray-600">
                  {confidencePreview.sourceCount} {confidencePreview.sourceCount === 1 ? 'source' : 'sources'}
                </span>
                {confidencePreview.hasFlags && (
                  <span className="flex items-center gap-1 text-xs text-amber-700">
                    <AlertTriangle className="w-3 h-3" />
                    Flagged
                  </span>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <p className={cn(
                "text-sm font-medium",
                getConfidenceColor(confidencePreview.confidence).text
              )}>
                {confidencePreview.confidence === "high" && "Strong evidence found. Auto-expanding answer..."}
                {confidencePreview.confidence === "medium" && "Moderate evidence found. Review recommended."}
                {confidencePreview.confidence === "low" && "Limited evidence available. Escalation may be needed."}
              </p>
              
              {confidencePreview.confidence !== "high" && (
                <Button
                  onClick={() => setShowFullAnswer(true)}
                  variant="outline"
                  className="w-full mt-2"
                >
                  View Answer Anyway
                </Button>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Answer Section */}
      {response && showFullAnswer && (
        <div className="mt-6 space-y-4">
          {/* Main Answer */}
          <Card className={cn(
            "shadow-md border overflow-hidden",
            getConfidenceColor(response.confidence).bg,
            getConfidenceColor(response.confidence).border
          )}>
            <div className="p-6">
              {/* Confidence header */}
              <div className="flex items-center gap-2 mb-4 pb-4 border-b border-gray-200">
                <CheckCircle2 className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-900">
                  {response.confidence.toUpperCase()} Confidence
                </span>
                {response.flags?.map((flag) => (
                  <PolicyFlag key={flag} type={flag} compact />
                ))}
                <div className="ml-auto flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleFeedback("up")}
                    className="h-7 w-7"
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleFeedback("down")}
                    className="h-7 w-7"
                  >
                    <ThumbsDown className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {/* Answer body with inline citations */}
              <div className="prose prose-gray max-w-none text-base leading-relaxed">
                <ReactMarkdown>{response.processedAnswer || response.answer}</ReactMarkdown>
              </div>

              {/* Inline citation references */}
              {response.citations?.length > 0 && (
                <div className="mt-6 pt-4 border-t border-gray-200 space-y-2">
                  <p className="text-xs font-medium text-gray-700 uppercase tracking-wide">Sources</p>
                  {response.citations.map((citation, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        const doc = documents.find(d => d.title === citation.title);
                        if (doc) trackDocumentView(doc.id, doc.title);
                        toast.info(`Viewing: ${citation.title}`);
                      }}
                      className="flex items-start gap-2 text-sm text-gray-700 hover:text-blue-600 transition-colors text-left w-full"
                    >
                      <span className="font-mono text-xs text-gray-500 mt-0.5">[{idx + 1}]</span>
                      <span className="flex-1">{citation.title}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Action Footer */}
            <div className="px-6 py-4 bg-white border-t border-gray-200">
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyToClipboard}
                >
                  <Copy className="w-4 h-4 mr-1.5" />
                  Copy Answer
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setResponse(null); setQuestion(""); setConfidencePreview(null); }}
                >
                  Ask Another
                </Button>
              </div>
            </div>
          </Card>

          {/* Action-Forward Next Steps */}
          {response.next_steps?.length > 0 && (
            <Card className="shadow-sm border border-gray-200">
              <div className="p-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">
                  Recommended Actions
                </h3>
                <div className="space-y-2">
                  {response.next_steps.map((step, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      className="w-full justify-start text-left h-auto py-3 px-4"
                      onClick={() => toast.info("Action: " + step)}
                    >
                      <ArrowRight className="w-4 h-4 mr-2 flex-shrink-0" />
                      <span className="text-sm">{step}</span>
                    </Button>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {/* Escalation (Elevated) */}
          {response.escalation && (
            <Card className="shadow-md border-2 border-amber-300 bg-amber-50">
              <div className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-lg bg-amber-100">
                    <AlertTriangle className="w-5 h-5 text-amber-700" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-amber-900 mb-2">
                      Escalation Required
                    </h3>
                    <p className="text-sm text-amber-800 mb-1">
                      <strong>Team:</strong> {response.escalation.target}
                    </p>
                    <p className="text-sm text-amber-700 mb-4">
                      {response.escalation.reason}
                    </p>
                    <Button
                      size="sm"
                      className="bg-amber-600 hover:bg-amber-700 text-white"
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
      {!response && !isLoading && !confidencePreview && (
        <div className="mt-12 space-y-6">
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-6">Try asking about:</p>
          </div>
          <div className="space-y-3">
            {[
              "How do we handle enterprise refund requests?",
              "What's our SLA for critical support tickets?",
              "Steps to troubleshoot API authentication failures",
            ].map((example, idx) => (
              <button
                key={idx}
                onClick={() => setQuestion(example)}
                className="w-full text-left p-4 rounded-lg border border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm transition-all"
              >
                <p className="text-sm text-gray-700">"{example}"</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}