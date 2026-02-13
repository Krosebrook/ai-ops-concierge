import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  AlertCircle, 
  TrendingUp, 
  Search, 
  Loader2,
  FileText,
  MessageSquare,
  ArrowRight,
  CheckCircle,
  X
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function ContentGapDetector() {
  const [isDetecting, setIsDetecting] = useState(false);
  const queryClient = useQueryClient();

  const { data: gaps = [], isLoading } = useQuery({
    queryKey: ["contentGaps"],
    queryFn: () => base44.entities.ContentGap.filter({ status: "identified" }, "-priority,-frequency")
  });

  const runDetection = async () => {
    setIsDetecting(true);
    try {
      const response = await base44.functions.invoke('detectContentGaps');
      toast.success(`Detected ${response.data.gaps_identified} content gaps`);
      queryClient.invalidateQueries({ queryKey: ["contentGaps"] });
    } catch (error) {
      toast.error("Detection failed");
    } finally {
      setIsDetecting(false);
    }
  };

  const updateGapStatus = async (gapId, newStatus) => {
    await base44.entities.ContentGap.update(gapId, { status: newStatus });
    queryClient.invalidateQueries({ queryKey: ["contentGaps"] });
    toast.success("Gap status updated");
  };

  const priorityConfig = {
    urgent: { color: "bg-red-100 text-red-800 border-red-200", icon: "🔥" },
    high: { color: "bg-orange-100 text-orange-800 border-orange-200", icon: "⚠️" },
    medium: { color: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: "📊" },
    low: { color: "bg-blue-100 text-blue-800 border-blue-200", icon: "📝" }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-orange-600" />
            Content Gap Detection
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Automatically identify missing content based on low-confidence answers and escalations
          </p>
        </div>
        <Button 
          onClick={runDetection} 
          disabled={isDetecting}
          className="gap-2"
        >
          {isDetecting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Search className="w-4 h-4" />
              Run Detection
            </>
          )}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : gaps.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <p className="text-gray-600">No content gaps detected</p>
            <p className="text-sm text-gray-500 mt-1">Run detection to analyze recent queries</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {gaps.map((gap) => {
            const priorityStyle = priorityConfig[gap.priority] || priorityConfig.low;
            
            return (
              <Card key={gap.id} className="shadow-sm">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">{priorityStyle.icon}</span>
                          <h4 className="font-semibold text-gray-900">{gap.topic}</h4>
                          <Badge className={cn("text-xs", priorityStyle.color)}>
                            {gap.priority} priority
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            <TrendingUp className="w-3 h-3 mr-1" />
                            {gap.frequency}x
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">{gap.description}</p>
                      </div>
                    </div>

                    {/* Query Examples */}
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-gray-700 uppercase tracking-wide">
                        Example Queries:
                      </p>
                      <div className="space-y-1">
                        {gap.query_examples?.slice(0, 3).map((query, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-sm text-gray-600 bg-gray-50 rounded p-2">
                            <MessageSquare className="w-3.5 h-3.5 mt-0.5 text-gray-400 flex-shrink-0" />
                            <span className="italic">"{query}"</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Suggested Tags */}
                    {gap.suggested_tags?.length > 0 && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-gray-500">Suggested tags:</span>
                        {gap.suggested_tags.map(tag => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Content Type Suggestion */}
                    <div className="flex items-center gap-2 text-sm">
                      <FileText className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">
                        Recommended: <strong>{gap.suggested_content_type || 'document'}</strong>
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
                      <Button
                        size="sm"
                        onClick={() => {
                          // Navigate to create content with pre-filled data
                          toast.info("Opening content creation form...");
                          // This would open a dialog or navigate to KB with pre-filled form
                        }}
                        className="gap-2"
                      >
                        <FileText className="w-4 h-4" />
                        Create Content
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateGapStatus(gap.id, 'in_progress')}
                      >
                        Mark In Progress
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => updateGapStatus(gap.id, 'dismissed')}
                        className="ml-auto"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Stats Summary */}
      {gaps.length > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-blue-900">{gaps.length}</p>
                <p className="text-xs text-blue-700">Total Gaps</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-900">
                  {gaps.filter(g => g.priority === 'high' || g.priority === 'urgent').length}
                </p>
                <p className="text-xs text-orange-700">High Priority</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-900">
                  {gaps.reduce((sum, g) => sum + (g.frequency || 0), 0)}
                </p>
                <p className="text-xs text-green-700">Total Queries</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}