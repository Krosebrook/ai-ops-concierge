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
      const response = await base44.functions.invoke("semanticSearch", { query });
      
      setResults({
        intent: response.data.intent,
        items: response.data.results,
        totalSearched: response.data.total_searched
      });

    } catch (error) {
      console.error("Search failed:", error);
      setResults({
        intent: "Search failed - please try again",
        items: [],
        totalSearched: 0
      });
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
          <div className="p-3 bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200 rounded-lg">
            <div className="flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-violet-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-violet-600 mb-1">Understanding your query:</p>
                <p className="text-sm text-violet-900">{results.intent}</p>
                {results.totalSearched > 0 && (
                  <p className="text-xs text-violet-600 mt-1">
                    Searched {results.totalSearched} items • Found {results.items.length} relevant results
                  </p>
                )}
              </div>
            </div>
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

                    {/* Confidence Score */}
                    <div className="text-right flex-shrink-0">
                      <div className={cn(
                        "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold mb-2",
                        item.confidence >= 0.8 ? "bg-emerald-100 text-emerald-700" :
                        item.confidence >= 0.6 ? "bg-blue-100 text-blue-700" :
                        item.confidence >= 0.4 ? "bg-amber-100 text-amber-700" :
                        "bg-slate-100 text-slate-600"
                      )}>
                        <Sparkles className="w-3 h-3" />
                        <span>{Math.round(item.confidence * 100)}%</span>
                      </div>
                      <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            item.confidence >= 0.8 ? "bg-gradient-to-r from-emerald-500 to-teal-500" :
                            item.confidence >= 0.6 ? "bg-gradient-to-r from-blue-500 to-indigo-500" :
                            item.confidence >= 0.4 ? "bg-gradient-to-r from-amber-500 to-orange-500" :
                            "bg-slate-400"
                          )}
                          style={{ width: `${item.confidence * 100}%` }}
                        />
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {item.confidence >= 0.8 ? "High" :
                         item.confidence >= 0.6 ? "Good" :
                         item.confidence >= 0.4 ? "Medium" : "Low"}
                      </p>
                      <ExternalLink className="w-3 h-3 text-slate-400 mt-2 mx-auto opacity-0 group-hover:opacity-100 transition-opacity" />
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