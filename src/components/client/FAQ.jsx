import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, ChevronDown, ChevronUp, Loader2, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import TagBadge from "@/components/ui/TagBadge";

export default function FAQ() {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  const { data: faqs = [], isLoading } = useQuery({
    queryKey: ["externalQAs"],
    queryFn: () => base44.entities.CuratedQA.filter({ 
      status: "approved",
      external_approved: true 
    }),
  });

  const filteredFAQs = faqs.filter((faq) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      faq.question?.toLowerCase().includes(query) ||
      faq.answer?.toLowerCase().includes(query) ||
      faq.tags?.some(tag => tag.toLowerCase().includes(query))
    );
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Search frequently asked questions..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* FAQs */}
      {filteredFAQs.length === 0 ? (
        <Card className="p-12 text-center">
          <HelpCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-700">No FAQs found</h3>
          <p className="text-sm text-slate-500 mt-2">
            Try a different search term or browse all questions.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredFAQs.map((faq) => (
            <Card
              key={faq.id}
              className="overflow-hidden hover:shadow-md transition-shadow"
            >
              <button
                onClick={() => setExpandedId(expandedId === faq.id ? null : faq.id)}
                className="w-full p-5 text-left flex items-start justify-between gap-4 group"
              >
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">
                    {faq.question}
                  </h3>
                  {faq.tags?.length > 0 && (
                    <div className="flex items-center gap-2 mt-2">
                      {faq.tags.map((tag) => (
                        <TagBadge key={tag} tag={tag} size="sm" />
                      ))}
                    </div>
                  )}
                </div>
                {expandedId === faq.id ? (
                  <ChevronUp className="w-5 h-5 text-slate-400 flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-400 flex-shrink-0" />
                )}
              </button>
              
              {expandedId === faq.id && (
                <div className="px-5 pb-5 pt-0 border-t border-slate-100 mt-2">
                  <div className="pt-4 prose prose-sm prose-slate max-w-none">
                    {faq.answer}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}