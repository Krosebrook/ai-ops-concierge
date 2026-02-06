import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Lightbulb, 
  FileText, 
  TrendingUp, 
  MessageSquare,
  ChevronRight,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function SuggestionsPanel({ conversationContext, onDocumentClick, onQuestionClick }) {
  const [suggestions, setSuggestions] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!conversationContext || conversationContext.length === 0) {
      // Show popular documents when no conversation
      loadPopularContent();
    } else {
      // Generate contextual suggestions
      generateSuggestions();
    }
  }, [conversationContext]);

  const loadPopularContent = async () => {
    try {
      const [documents, qas] = await Promise.all([
        base44.entities.Document.filter({ status: "active" }, "-view_count", 5),
        base44.entities.CuratedQA.filter({ status: "approved" }, "-created_date", 3)
      ]);

      setSuggestions({
        documents: documents.slice(0, 3),
        questions: qas.map(qa => qa.question).slice(0, 3),
        type: "popular"
      });
    } catch (error) {
      console.error("Failed to load popular content:", error);
    }
  };

  const generateSuggestions = async () => {
    setIsLoading(true);
    try {
      // Get recent conversation messages
      const recentMessages = conversationContext.slice(-4).map(m => m.content).join("\n");

      // Fetch documents to analyze
      const documents = await base44.entities.Document.filter({ status: "active" });

      // Use AI to suggest related content
      const prompt = `Based on this conversation, suggest related documents and follow-up questions.

Conversation:
${recentMessages}

Available documents:
${documents.map(d => `- ${d.title} (Tags: ${d.tags?.join(", ")})`).join("\n")}

Provide:
1. Top 3 most relevant document titles from the list above
2. 3 natural follow-up questions the user might want to ask

Return JSON.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            related_documents: {
              type: "array",
              items: { type: "string" }
            },
            follow_up_questions: {
              type: "array",
              items: { type: "string" }
            }
          }
        }
      });

      // Match suggested document titles to actual documents
      const relatedDocs = documents.filter(d => 
        response.related_documents?.some(title => 
          d.title.toLowerCase().includes(title.toLowerCase()) || 
          title.toLowerCase().includes(d.title.toLowerCase())
        )
      ).slice(0, 3);

      setSuggestions({
        documents: relatedDocs,
        questions: response.follow_up_questions || [],
        type: "contextual"
      });
    } catch (error) {
      console.error("Failed to generate suggestions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="h-full overflow-hidden flex flex-col">
      <CardHeader className="pb-3 bg-gradient-to-br from-violet-50 to-purple-50 border-b">
        <CardTitle className="text-base flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-violet-600" />
          {suggestions?.type === "contextual" ? "Related Content" : "Popular Content"}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-violet-600" />
          </div>
        ) : (
          <>
            {/* Related Documents */}
            {suggestions?.documents && suggestions.documents.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-4 h-4 text-slate-500" />
                  <h4 className="text-sm font-semibold text-slate-700">
                    {suggestions.type === "contextual" ? "Related Documents" : "Trending Documents"}
                  </h4>
                </div>
                <div className="space-y-2">
                  {suggestions.documents.map((doc) => (
                    <button
                      key={doc.id}
                      onClick={() => onDocumentClick?.(doc)}
                      className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-violet-300 hover:bg-violet-50 transition-all group"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 line-clamp-2 group-hover:text-violet-700">
                            {doc.title}
                          </p>
                          {doc.tags && doc.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {doc.tags.slice(0, 2).map(tag => (
                                <Badge key={tag} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                          {doc.view_count > 0 && suggestions.type === "popular" && (
                            <div className="flex items-center gap-1 mt-1.5 text-xs text-slate-500">
                              <TrendingUp className="w-3 h-3" />
                              {doc.view_count} views
                            </div>
                          )}
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-violet-600 flex-shrink-0 ml-2" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Follow-up Questions */}
            {suggestions?.questions && suggestions.questions.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <MessageSquare className="w-4 h-4 text-slate-500" />
                  <h4 className="text-sm font-semibold text-slate-700">
                    {suggestions.type === "contextual" ? "Follow-up Questions" : "Try Asking"}
                  </h4>
                </div>
                <div className="space-y-2">
                  {suggestions.questions.map((question, idx) => (
                    <button
                      key={idx}
                      onClick={() => onQuestionClick?.(question)}
                      className="w-full text-left p-3 rounded-lg bg-white border border-slate-200 hover:border-violet-300 hover:bg-violet-50 transition-all text-sm text-slate-700 hover:text-violet-700"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!suggestions && !isLoading && (
              <div className="text-center py-8">
                <Lightbulb className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">
                  Suggestions will appear as you chat
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}