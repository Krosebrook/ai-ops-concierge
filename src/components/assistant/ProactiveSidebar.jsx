import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Sparkles, 
  FileText, 
  MessageSquare, 
  Search,
  X,
  ChevronRight,
  Lightbulb,
  TrendingUp,
  ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function ProactiveSidebar({ isOpen, onClose }) {
  const [sessionId] = useState(() => `session_${Date.now()}`);

  const { data: suggestions = [], refetch } = useQuery({
    queryKey: ["proactiveSuggestions"],
    queryFn: async () => {
      const response = await base44.functions.invoke('generateProactiveSuggestions');
      return response.data.suggestions || [];
    },
    enabled: isOpen,
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });

  const getIcon = (type) => {
    switch(type) {
      case 'document': return FileText;
      case 'qa': return MessageSquare;
      case 'question': return Search;
      case 'exploration': return TrendingUp;
      default: return Lightbulb;
    }
  };

  const handleSuggestionClick = async (suggestion) => {
    if (suggestion.type === 'document' && suggestion.related_document_id) {
      // Track activity
      await base44.entities.UserActivity.create({
        user_id: (await base44.auth.me()).id,
        user_email: (await base44.auth.me()).email,
        activity_type: 'document_view',
        activity_context: {
          document_id: suggestion.related_document_id,
          document_title: suggestion.document_title
        },
        session_id: sessionId
      });
      
      toast.success(`Opening: ${suggestion.document_title}`);
      // Navigate to document - implement based on your routing
    } else if (suggestion.type === 'question') {
      toast.info("Loading question in Ask mode...");
      // Navigate to Ask page with pre-filled question
    }
  };

  if (!isOpen) return null;

  return (
    <div className={cn(
      "fixed top-0 right-0 h-full w-96 bg-white border-l border-gray-200 shadow-2xl z-50 transform transition-transform duration-300",
      isOpen ? "translate-x-0" : "translate-x-full"
    )}>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-indigo-100">
                <Sparkles className="w-4 h-4 text-indigo-600" />
              </div>
              <h3 className="font-semibold text-gray-900">AI Assistant</h3>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-gray-600">
            Suggestions based on your recent activity
          </p>
        </div>

        {/* Suggestions */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {suggestions.length === 0 ? (
            <Card className="p-6 text-center bg-gray-50">
              <Lightbulb className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">
                Keep exploring! Suggestions will appear based on your activity.
              </p>
            </Card>
          ) : (
            suggestions.map((suggestion, idx) => {
              const Icon = getIcon(suggestion.type);
              const relevancePercent = Math.round(suggestion.relevance_score * 100);
              
              return (
                <Card 
                  key={idx}
                  className="p-4 hover:shadow-md transition-shadow cursor-pointer group"
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-indigo-50 group-hover:bg-indigo-100 transition-colors">
                        <Icon className="w-4 h-4 text-indigo-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="secondary" className="text-xs">
                            {suggestion.type}
                          </Badge>
                          {relevancePercent >= 80 && (
                            <Badge className="text-xs bg-green-100 text-green-800">
                              Highly Relevant
                            </Badge>
                          )}
                        </div>
                        <h4 className="font-medium text-gray-900 text-sm group-hover:text-indigo-600 transition-colors">
                          {suggestion.title}
                        </h4>
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                          {suggestion.description}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-indigo-600 transition-colors flex-shrink-0" />
                    </div>

                    {suggestion.action && (
                      <div className="flex items-center gap-2 text-xs text-indigo-600 font-medium">
                        <ExternalLink className="w-3 h-3" />
                        {suggestion.action}
                      </div>
                    )}
                  </div>
                </Card>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="w-full"
          >
            <Sparkles className="w-3 h-3 mr-2" />
            Refresh Suggestions
          </Button>
        </div>
      </div>
    </div>
  );
}