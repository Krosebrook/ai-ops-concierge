import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Send, Loader2, Sparkles, BookOpen, HelpCircle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

export default function ClientAsk() {
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: externalDocs = [] } = useQuery({
    queryKey: ["externalDocs"],
    queryFn: () => base44.entities.Document.filter({ 
      status: "active", 
      external_approved: true 
    }),
  });

  const { data: externalQAs = [] } = useQuery({
    queryKey: ["externalQAs"],
    queryFn: () => base44.entities.CuratedQA.filter({ 
      status: "approved",
      external_approved: true 
    }),
  });

  const handleAsk = async () => {
    if (!question.trim()) return;
    
    setIsLoading(true);
    setResponse(null);

    const knowledgeContext = [
      ...externalDocs.slice(0, 5).map(d => `[${d.title}]\n${d.content?.slice(0, 400) || ""}`),
      ...externalQAs.slice(0, 5).map(qa => `Q: ${qa.question}\nA: ${qa.answer}`)
    ].join("\n\n---\n\n");

    const prompt = `You are a helpful assistant for customers.

APPROVED KNOWLEDGE BASE (only use this information):
${knowledgeContext || "No approved content available."}

CUSTOMER QUESTION: ${question}

INSTRUCTIONS:
1. Answer ONLY using the approved knowledge base above
2. If the information isn't in the knowledge base, politely say you don't have that information and suggest they contact support
3. Be friendly, clear, and helpful
4. Use simple language - assume the customer is not technical
5. If relevant, suggest related help topics

Respond in JSON format:
{
  "answer": "Your friendly, clear answer",
  "has_answer": true/false (whether you found relevant info),
  "related_topics": ["Topic 1", "Topic 2"] (if applicable),
  "suggested_action": "Contact support" or "Check documentation" (if needed)
}`;

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            answer: { type: "string" },
            has_answer: { type: "boolean" },
            related_topics: { type: "array", items: { type: "string" } },
            suggested_action: { type: "string" }
          }
        }
      });

      setResponse(result);
    } catch (error) {
      toast.error("Failed to get response. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Input */}
      <Card className="bg-white shadow-lg border-0 overflow-hidden">
        <div className="p-6">
          <Textarea
            placeholder="Ask a question... (e.g., 'How do I reset my password?')"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="min-h-[100px] text-base border-0 focus-visible:ring-0 resize-none p-0"
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.metaKey) {
                handleAsk();
              }
            }}
          />
        </div>
        <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-end">
          <Button
            onClick={handleAsk}
            disabled={!question.trim() || isLoading}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Getting answer...
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

      {/* Response */}
      {response && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Card className="bg-white border-0 shadow-lg overflow-hidden">
            <div className="p-6">
              {!response.has_answer && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-800">
                    ℹ️ This information isn't in our help center. We recommend contacting support for assistance.
                  </p>
                </div>
              )}
              
              <div className="prose prose-slate prose-sm max-w-none">
                <ReactMarkdown>{response.answer}</ReactMarkdown>
              </div>
            </div>

            {response.suggested_action && (
              <div className="px-6 py-3 bg-blue-50 border-t border-blue-100">
                <p className="text-sm text-blue-800">
                  <strong>Next step:</strong> {response.suggested_action}
                </p>
              </div>
            )}
          </Card>

          {response.related_topics?.length > 0 && (
            <Card className="bg-gradient-to-br from-slate-50 to-blue-50/30 border-slate-200">
              <div className="p-5">
                <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  Related Topics
                </h3>
                <div className="space-y-2">
                  {response.related_topics.map((topic, idx) => (
                    <button
                      key={idx}
                      onClick={() => setQuestion(topic)}
                      className="flex items-center gap-2 text-sm text-slate-600 hover:text-blue-600 transition-colors"
                    >
                      <HelpCircle className="w-3 h-3" />
                      {topic}
                    </button>
                  ))}
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Suggested Questions */}
      {!response && !isLoading && externalQAs.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-3">
            Popular Questions
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {externalQAs.slice(0, 4).map((qa) => (
              <button
                key={qa.id}
                onClick={() => setQuestion(qa.question)}
                className="text-left p-4 rounded-xl border border-slate-200 bg-white hover:border-blue-300 hover:shadow-md hover:shadow-blue-100/50 transition-all duration-200"
              >
                <p className="text-sm text-slate-700 font-medium line-clamp-2">
                  {qa.question}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}