import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Copy, Archive, Loader2, FileText, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function ContentAnalysis() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState(null);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const response = await base44.functions.invoke("detectDuplicates", {});
      setAnalysisResults(response.data);
      toast.success("Analysis complete");
    } catch (error) {
      toast.error("Analysis failed");
      console.error(error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-violet-600" />
                Content Quality Analysis
              </CardTitle>
              <p className="text-sm text-slate-600 mt-1">
                AI-powered detection of duplicates and outdated content
              </p>
            </div>
            <Button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="bg-gradient-to-r from-violet-600 to-purple-600"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                "Run Analysis"
              )}
            </Button>
          </div>
        </CardHeader>

        {analysisResults && (
          <CardContent className="space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-2xl font-bold text-slate-900">
                  {analysisResults.total_analyzed}
                </p>
                <p className="text-sm text-slate-600">Documents Analyzed</p>
              </div>
              <div className="p-4 bg-amber-50 rounded-lg">
                <p className="text-2xl font-bold text-amber-900">
                  {analysisResults.duplicates.length}
                </p>
                <p className="text-sm text-amber-700">Duplicate Groups</p>
              </div>
              <div className="p-4 bg-red-50 rounded-lg">
                <p className="text-2xl font-bold text-red-900">
                  {analysisResults.outdated.length}
                </p>
                <p className="text-sm text-red-700">Outdated Documents</p>
              </div>
            </div>

            {/* Duplicates */}
            {analysisResults.duplicates.length > 0 && (
              <div>
                <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <Copy className="w-4 h-4 text-amber-600" />
                  Duplicate Content Detected
                </h4>
                <div className="space-y-3">
                  {analysisResults.duplicates.map((dup, idx) => (
                    <Card key={idx} className="border-amber-200 bg-amber-50/50">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <FileText className="w-4 h-4 text-amber-600" />
                              <span className="font-medium text-slate-800">
                                {dup.primary.title}
                              </span>
                              <Badge className="bg-amber-100 text-amber-800">
                                {Math.round(dup.similarity * 100)}% similar
                              </Badge>
                            </div>
                            <p className="text-sm text-slate-600 mb-2">{dup.reason}</p>
                            <div className="space-y-1">
                              <p className="text-xs font-medium text-slate-500">Similar to:</p>
                              {dup.duplicates.map((d, i) => (
                                <p key={i} className="text-xs text-slate-600 pl-3">
                                  • {d.title}
                                </p>
                              ))}
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {dup.recommendation}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Outdated */}
            {analysisResults.outdated.length > 0 && (
              <div>
                <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  Potentially Outdated Content
                </h4>
                <div className="space-y-3">
                  {analysisResults.outdated.map((out, idx) => (
                    <Card key={idx} className="border-red-200 bg-red-50/50">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <FileText className="w-4 h-4 text-red-600" />
                              <span className="font-medium text-slate-800">
                                {out.document.title}
                              </span>
                              <Badge
                                className={cn(
                                  out.confidence >= 0.7
                                    ? "bg-red-100 text-red-800"
                                    : "bg-orange-100 text-orange-800"
                                )}
                              >
                                {Math.round(out.confidence * 100)}% confidence
                              </Badge>
                            </div>
                            <p className="text-sm text-slate-600">{out.reason}</p>
                          </div>
                          <Badge variant="outline" className="text-xs capitalize">
                            {out.action}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {analysisResults.duplicates.length === 0 &&
              analysisResults.outdated.length === 0 && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-100 flex items-center justify-center mb-3">
                    <TrendingUp className="w-8 h-8 text-emerald-600" />
                  </div>
                  <p className="text-sm font-medium text-slate-800">
                    Content quality looks great!
                  </p>
                  <p className="text-xs text-slate-600 mt-1">
                    No duplicates or outdated documents detected
                  </p>
                </div>
              )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}