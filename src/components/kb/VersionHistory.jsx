import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Clock, 
  User, 
  GitBranch, 
  Eye, 
  RotateCcw,
  AlertTriangle,
  Loader2,
  ChevronRight
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function VersionHistory({ documentId, onRevert }) {
  const [selectedVersions, setSelectedVersions] = useState(null);
  const [diffAnalysis, setDiffAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const { data: versions, isLoading } = useQuery({
    queryKey: ['document-versions', documentId],
    queryFn: async () => {
      // Fetch current document and all its previous versions
      const current = await base44.entities.Document.filter({ id: documentId });
      const allVersions = [current[0]];
      
      let prevId = current[0]?.previous_version_id;
      while (prevId) {
        const prev = await base44.entities.Document.filter({ id: prevId });
        if (prev[0]) {
          allVersions.push(prev[0]);
          prevId = prev[0].previous_version_id;
        } else {
          break;
        }
      }
      
      return allVersions;
    },
    enabled: !!documentId
  });

  const handleCompare = async (currentVer, previousVer) => {
    setSelectedVersions({ current: currentVer, previous: previousVer });
    setIsAnalyzing(true);

    try {
      const response = await base44.functions.invoke('analyzeVersionChanges', {
        currentVersionId: currentVer.id,
        previousVersionId: previousVer.id
      });

      setDiffAnalysis(response.data);
    } catch (error) {
      toast.error("Failed to analyze changes");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRevert = async (versionId) => {
    try {
      await base44.entities.Document.update(documentId, {
        content: versions.find(v => v.id === versionId)?.content,
        version: (versions[0]?.version || 1) + 1,
        previous_version_id: documentId
      });

      toast.success("Reverted to previous version");
      onRevert?.();
    } catch (error) {
      toast.error("Failed to revert");
    }
  };

  if (isLoading) {
    return (
      <Card className="p-8 text-center">
        <Loader2 className="w-6 h-6 animate-spin text-violet-600 mx-auto mb-2" />
        <p className="text-sm text-slate-600">Loading version history...</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-violet-600" />
            Version History
          </CardTitle>
          <p className="text-sm text-slate-600">
            {versions?.length || 0} versions available
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {versions?.map((version, idx) => {
            const isLatest = idx === 0;
            
            return (
              <Card
                key={version.id}
                className={cn(
                  "p-4 transition-all",
                  isLatest && "border-violet-300 bg-violet-50"
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={isLatest ? "default" : "secondary"}>
                        v{version.version || idx + 1}
                      </Badge>
                      {isLatest && (
                        <Badge className="bg-violet-600">Current</Badge>
                      )}
                    </div>

                    <div className="space-y-1 text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3 h-3" />
                        <span>{format(new Date(version.updated_date), 'PPp')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="w-3 h-3" />
                        <span>{version.owner_name || 'Unknown'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {idx < versions.length - 1 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCompare(version, versions[idx + 1])}
                        className="gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        Compare
                      </Button>
                    )}
                    {!isLatest && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRevert(version.id)}
                        className="gap-1"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Revert
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </CardContent>
      </Card>

      {/* Diff Analysis Dialog */}
      <Dialog open={!!selectedVersions} onOpenChange={() => setSelectedVersions(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitBranch className="w-5 h-5" />
              Version Comparison
            </DialogTitle>
          </DialogHeader>

          {isAnalyzing ? (
            <div className="py-12 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-violet-600 mx-auto mb-3" />
              <p className="text-sm text-slate-600">Analyzing changes...</p>
            </div>
          ) : diffAnalysis && (
            <div className="space-y-4">
              {/* Summary */}
              <Card className="bg-slate-50">
                <CardContent className="p-4">
                  <h4 className="font-semibold text-slate-800 mb-2">Summary</h4>
                  <p className="text-sm text-slate-700">{diffAnalysis.summary}</p>
                  <div className="flex items-center gap-2 mt-3">
                    <Badge
                      className={cn(
                        diffAnalysis.overall_impact === "major" && "bg-red-100 text-red-700",
                        diffAnalysis.overall_impact === "moderate" && "bg-amber-100 text-amber-700",
                        diffAnalysis.overall_impact === "minor" && "bg-blue-100 text-blue-700"
                      )}
                    >
                      {diffAnalysis.overall_impact} impact
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Breaking Changes */}
              {diffAnalysis.breaking_changes?.length > 0 && (
                <Card className="border-red-200 bg-red-50">
                  <CardContent className="p-4">
                    <h4 className="font-semibold text-red-900 mb-3 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Breaking Changes
                    </h4>
                    <div className="space-y-2">
                      {diffAnalysis.breaking_changes.map((change, idx) => (
                        <div key={idx} className="p-3 bg-white rounded border border-red-200">
                          <p className="text-sm font-medium text-red-900 mb-1">
                            {change.description}
                          </p>
                          <p className="text-xs text-red-700">{change.reason}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Key Changes */}
              <Card>
                <CardContent className="p-4">
                  <h4 className="font-semibold text-slate-800 mb-3">Key Changes</h4>
                  <div className="space-y-2">
                    {diffAnalysis.key_changes?.map((change, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 rounded border">
                        <div className="flex items-start gap-2">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs capitalize mt-0.5",
                              change.type === "addition" && "border-green-300 text-green-700",
                              change.type === "deletion" && "border-red-300 text-red-700",
                              change.type === "modification" && "border-blue-300 text-blue-700"
                            )}
                          >
                            {change.type}
                          </Badge>
                          <div className="flex-1">
                            <p className="text-sm text-slate-800 mb-1">{change.description}</p>
                            <p className="text-xs text-slate-500">Location: {change.location}</p>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {change.impact}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Recommendation */}
              {diffAnalysis.recommendation && (
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4">
                    <h4 className="font-semibold text-blue-900 mb-2">Recommendation</h4>
                    <p className="text-sm text-blue-800">{diffAnalysis.recommendation}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}