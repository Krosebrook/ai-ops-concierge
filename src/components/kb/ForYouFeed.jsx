import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Sparkles, 
  FileText, 
  HelpCircle, 
  TrendingUp, 
  Clock, 
  Star,
  Loader2,
  RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";
import TagBadge from "@/components/ui/TagBadge";
import { format } from "date-fns";

export default function ForYouFeed({ onItemClick }) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['recommendations'],
    queryFn: async () => {
      const response = await base44.functions.invoke('generateRecommendations', {});
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'trending': return TrendingUp;
      case 'new': return Clock;
      case 'popular': return Star;
      default: return Sparkles;
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'trending': return 'text-orange-600 bg-orange-100';
      case 'new': return 'text-blue-600 bg-blue-100';
      case 'popular': return 'text-purple-600 bg-purple-100';
      default: return 'text-violet-600 bg-violet-100';
    }
  };

  if (isLoading) {
    return (
      <Card className="p-12 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-600 mx-auto mb-3" />
        <p className="text-sm text-slate-600">Personalizing your feed...</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Insights Header */}
      {data?.insights && (
        <Card className="bg-gradient-to-r from-violet-50 to-purple-50 border-violet-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-violet-900 mb-1">
                  Personalized for You
                </h3>
                <p className="text-sm text-violet-700">{data.insights}</p>
                {data.user_profile && (
                  <p className="text-xs text-violet-600 mt-2">
                    Based on {data.user_profile.queries_analyzed} recent queries
                    {data.user_profile.interest_tags.length > 0 && 
                      ` • Interests: ${data.user_profile.interest_tags.join(", ")}`
                    }
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refetch()}
                className="text-violet-700 hover:text-violet-900"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations Grid */}
      <div className="grid gap-4">
        {data?.recommendations?.map((item, idx) => {
          const CategoryIcon = getCategoryIcon(item.category);
          
          return (
            <Card
              key={idx}
              className="hover:shadow-lg transition-all cursor-pointer group border-l-4"
              style={{
                borderLeftColor: item.relevance_score >= 0.8 ? '#8b5cf6' : 
                                 item.relevance_score >= 0.6 ? '#3b82f6' : '#94a3b8'
              }}
              onClick={() => onItemClick?.(item)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0",
                    item.type === "document" ? "bg-blue-100" : "bg-emerald-100"
                  )}>
                    {item.type === "document" ? (
                      <FileText className="w-6 h-6 text-blue-600" />
                    ) : (
                      <HelpCircle className="w-6 h-6 text-emerald-600" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h3 className="font-semibold text-slate-800 group-hover:text-violet-600 transition-colors">
                        {item.title}
                      </h3>
                      <div className={cn(
                        "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium flex-shrink-0",
                        getCategoryColor(item.category)
                      )}>
                        <CategoryIcon className="w-3 h-3" />
                        <span className="capitalize">{item.category}</span>
                      </div>
                    </div>

                    {item.summary && (
                      <p className="text-sm text-slate-600 mb-3 line-clamp-2">
                        {item.summary}
                      </p>
                    )}

                    {/* Meta info */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary" className="text-xs">
                        {item.type === "document" ? "Document" : "Q&A"}
                      </Badge>
                      {item.tags?.slice(0, 2).map(tag => (
                        <TagBadge key={tag} tag={tag} size="sm" />
                      ))}
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          item.relevance_score >= 0.8 ? "bg-violet-600" :
                          item.relevance_score >= 0.6 ? "bg-blue-600" : "bg-slate-400"
                        )} />
                        <span>{Math.round(item.relevance_score * 100)}% match</span>
                      </div>
                    </div>

                    {/* Reason */}
                    <div className="mt-3 p-2 bg-slate-50 rounded-lg border border-slate-200">
                      <p className="text-xs text-slate-600">
                        <span className="font-medium text-slate-700">Why recommended: </span>
                        {item.reason}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {(!data?.recommendations || data.recommendations.length === 0) && (
        <Card className="p-12 text-center">
          <Sparkles className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-600 mb-2">
            No recommendations yet
          </p>
          <p className="text-xs text-slate-500">
            Start using the Knowledge Base to get personalized recommendations
          </p>
        </Card>
      )}
    </div>
  );
}