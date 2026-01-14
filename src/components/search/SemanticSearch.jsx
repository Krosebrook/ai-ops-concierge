import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, FileText, HelpCircle, Sparkles, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import TagBadge from "@/components/ui/TagBadge";

export default function SemanticSearch({ onResultClick }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    
    setIsSearching(true);
    
    try {
      // Fetch all knowledge base content
      const [documents, qas] = await Promise.all([
        base44.entities.Document.filter({ status: "active" }),
        base44.entities.CuratedQA.filter({ status: "approved" })
      ]);

      // Build context for semantic understanding
      const knowledgeContext = [
        ...documents.map(d => ({
          type: "document",
          id: d.id,
          title: d.title,
          content: d.content || "",
          tags: d.tags || []
        })),
        ...qas.map(qa => ({
          type: "qa",
          id: qa.id,
          title: qa.question,
          content: qa.answer,
          tags: qa.tags || []
        }))
      ];

      const prompt = `You are a semantic search engine analyzing a user's query against a knowledge base.

USER QUERY: "${query}"

KNOWLEDGE BASE:
${knowledgeContext.map((item, idx) => 
  `[${idx}] ${item.type.toUpperCase()}: ${item.title}\n${item.content.slice(0, 500)}\nTags: ${item.tags.join(", ")}`
).join("\n\n---\n\n")}

TASK:
1. Understand the user's intent and what they're really asking for
2. Find the most relevant items from the knowledge base
3. For each relevant item, extract the specific section that answers the query
4. Rank by relevance (0.0 to 1.0)

Return the top 5 most relevant results with extracted highlights.

Respond in JSON format:
{
  "intent": "What the user is trying to find out",
  "results": [
    {
      "index": number (the [idx] from above),
      "relevance": 0.0-1.0,
      "highlight": "The specific relevant excerpt from content (max 200 chars)",
      "reason": "Why this is relevant to the query"
    }
  ]
}`;

      const searchResult = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            intent: { type: "string" },
            results: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  index: { type: "number" },
                  relevance: { type: "number" },
                  highlight: { type: "string" },
                  reason: { type: "string" }
                }
              }
            }
          }
        }
      });

      // Map results back to original items
      const enrichedResults = searchResult.results.map(r => ({
        ...knowledgeContext[r.index],
        relevance: r.relevance,
        highlight: r.highlight,
        reason: r.reason
      }));

      setResults({
        intent: searchResult.intent,
        items: enrichedResults
      });

    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Sparkles className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-violet-500" />
          <Input
            placeholder="Ask anything... (e.g., 'How do we handle upset customers?')"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="pl-10"
          />
        </div>
        <Button
          onClick={handleSearch}
          disabled={!query.trim() || isSearching}
          className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
        >
          {isSearching ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Searching...
            </>
          ) : (
            <>
              <Search className="w-4 h-4 mr-2" />
              Search
            </>
          )}
        </Button>
      </div>

      {/* Results */}
      {results && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Intent */}
          <div className="p-3 bg-violet-50 border border-violet-200 rounded-lg">
            <p className="text-xs font-medium text-violet-600 mb-1">Understanding your query:</p>
            <p className="text-sm text-violet-800">{results.intent}</p>
          </div>

          {/* Results */}
          <div className="space-y-3">
            {results.items.length === 0 ? (
              <Card className="p-8 text-center">
                <Search className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No relevant results found</p>
              </Card>
            ) : (
              results.items.map((item, idx) => (
                <Card
                  key={`${item.type}-${item.id}`}
                  className="p-4 hover:shadow-md transition-shadow cursor-pointer group"
                  onClick={() => onResultClick?.(item)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center",
                          item.type === "document" 
                            ? "bg-blue-100" 
                            : "bg-emerald-100"
                        )}>
                          {item.type === "document" ? (
                            <FileText className="w-4 h-4 text-blue-600" />
                          ) : (
                            <HelpCircle className="w-4 h-4 text-emerald-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-slate-800 truncate group-hover:text-violet-600 transition-colors">
                            {item.title}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              {item.type === "document" ? "Document" : "Q&A"}
                            </Badge>
                            {item.tags?.slice(0, 2).map((tag) => (
                              <TagBadge key={tag} tag={tag} />
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Highlight */}
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 mb-2">
                        <p className="text-sm text-slate-700 italic">
                          "...{item.highlight}..."
                        </p>
                      </div>

                      {/* Reason */}
                      <p className="text-xs text-slate-500">
                        <strong>Why relevant:</strong> {item.reason}
                      </p>
                    </div>

                    {/* Relevance Score */}
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-xs text-slate-500 mb-1">
                        <span>{Math.round(item.relevance * 100)}%</span>
                      </div>
                      <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full"
                          style={{ width: `${item.relevance * 100}%` }}
                        />
                      </div>
                      <ExternalLink className="w-3 h-3 text-slate-400 mt-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}