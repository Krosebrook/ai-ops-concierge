import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Lightbulb,
  TrendingUp,
  FileText,
  HelpCircle,
  Loader2,
  CheckCircle2,
  X,
  AlertCircle,
  Eye,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import TagBadge from "@/components/ui/TagBadge";

export default function ContentGaps({ user, hasPermission }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedGap, setSelectedGap] = useState(null);
  const [creatingContent, setCreatingContent] = useState(false);
  const queryClient = useQueryClient();

  const { data: gaps = [], isLoading } = useQuery({
    queryKey: ["contentGaps"],
    queryFn: () => base44.entities.ContentGap.filter({ status: { $in: ["identified", "in_progress"] } }, "-priority", 50),
  });

  const analyzeGaps = async () => {
    if (!hasPermission('review_ai_suggestions')) {
      toast.error('You need permission to analyze content gaps');
      return;
    }

    setAnalyzing(true);
    try {
      const result = await base44.functions.invoke('analyzeContentGaps', {});
      queryClient.invalidateQueries({ queryKey: ["contentGaps"] });
      toast.success(`Found ${result.data.gaps.length} content gaps from ${result.data.analyzed_events} queries`);
    } catch (error) {
      toast.error('Analysis failed: ' + error.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const priorityConfig = {
    urgent: { color: "bg-red-100 text-red-800", label: "Urgent" },
    high: { color: "bg-orange-100 text-orange-800", label: "High" },
    medium: { color: "bg-yellow-100 text-yellow-800", label: "Medium" },
    low: { color: "bg-blue-100 text-blue-800", label: "Low" }
  };

  const statusConfig = {
    identified: { icon: Lightbulb, color: "text-yellow-600", label: "New" },
    in_progress: { icon: Loader2, color: "text-blue-600", label: "In Progress", spin: true },
    addressed: { icon: CheckCircle2, color: "text-green-600", label: "Addressed" },
    dismissed: { icon: X, color: "text-slate-400", label: "Dismissed" }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-violet-600" />
            Content Gaps Analysis
          </h3>
          <p className="text-sm text-slate-600 mt-1">
            AI-identified documentation gaps based on user queries
          </p>
        </div>
        {hasPermission('review_ai_suggestions') && (
          <Button
            onClick={analyzeGaps}
            disabled={analyzing}
            className="gap-2"
          >
            {analyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Run Analysis
              </>
            )}
          </Button>
        )}
      </div>

      {/* Stats */}
      {gaps.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Total Gaps</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{gaps.length}</p>
                </div>
                <AlertCircle className="w-8 h-8 text-slate-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">High Priority</p>
                  <p className="text-2xl font-bold text-orange-600 mt-1">
                    {gaps.filter(g => g.priority === 'high' || g.priority === 'urgent').length}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-orange-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">In Progress</p>
                  <p className="text-2xl font-bold text-blue-600 mt-1">
                    {gaps.filter(g => g.status === 'in_progress').length}
                  </p>
                </div>
                <Loader2 className="w-8 h-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Total Queries</p>
                  <p className="text-2xl font-bold text-violet-600 mt-1">
                    {gaps.reduce((sum, g) => sum + (g.frequency || 0), 0)}
                  </p>
                </div>
                <Eye className="w-8 h-8 text-violet-400" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Gap Cards */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      ) : gaps.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Lightbulb className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600">No content gaps identified yet.</p>
            <p className="text-sm text-slate-500 mt-1">Run an analysis to discover areas for improvement.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {gaps.map((gap) => {
            const StatusIcon = statusConfig[gap.status]?.icon || Lightbulb;
            const priority = priorityConfig[gap.priority] || priorityConfig.medium;
            
            return (
              <Card key={gap.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <StatusIcon className={cn("w-4 h-4", statusConfig[gap.status]?.color, statusConfig[gap.status]?.spin && "animate-spin")} />
                        <h4 className="font-semibold text-slate-900">{gap.topic}</h4>
                        <Badge className={priority.color}>{priority.label}</Badge>
                        {gap.frequency > 1 && (
                          <Badge variant="outline" className="gap-1">
                            <TrendingUp className="w-3 h-3" />
                            {gap.frequency}x asked
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-sm text-slate-600 mb-3">{gap.description}</p>
                      
                      {gap.suggested_tags && gap.suggested_tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {gap.suggested_tags.map(tag => (
                            <TagBadge key={tag} tag={tag} size="sm" />
                          ))}
                        </div>
                      )}

                      {gap.query_examples && gap.query_examples.length > 0 && (
                        <details className="text-xs text-slate-500">
                          <summary className="cursor-pointer hover:text-slate-700">
                            View example queries ({gap.query_examples.length})
                          </summary>
                          <ul className="mt-2 space-y-1 ml-4 list-disc">
                            {gap.query_examples.slice(0, 3).map((q, i) => (
                              <li key={i}>{q}</li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </div>

                    <div className="flex gap-2 ml-4">
                      {hasPermission('upload_documents') && gap.status === 'identified' && (
                        <Button
                          size="sm"
                          onClick={() => setSelectedGap(gap)}
                          className="gap-2"
                        >
                          {gap.suggested_content_type === 'qa' ? (
                            <HelpCircle className="w-4 h-4" />
                          ) : (
                            <FileText className="w-4 h-4" />
                          )}
                          Create Content
                        </Button>
                      )}
                      <DismissGapButton gap={gap} queryClient={queryClient} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {selectedGap && (
        <CreateContentDialog
          gap={selectedGap}
          onClose={() => setSelectedGap(null)}
          user={user}
          queryClient={queryClient}
        />
      )}
    </div>
  );
}

function DismissGapButton({ gap, queryClient }) {
  const [showDialog, setShowDialog] = useState(false);
  const [reason, setReason] = useState("");

  const mutation = useMutation({
    mutationFn: () => base44.entities.ContentGap.update(gap.id, {
      status: 'dismissed',
      dismissed_reason: reason
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contentGaps"] });
      toast.success("Gap dismissed");
      setShowDialog(false);
    }
  });

  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setShowDialog(true)}
      >
        <X className="w-4 h-4" />
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dismiss Content Gap</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-slate-600">
              Why is this gap not relevant or needed?
            </p>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Optional reason..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={() => mutation.mutate()}>Dismiss</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function CreateContentDialog({ gap, onClose, user, queryClient }) {
  const [title, setTitle] = useState(gap.topic);
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async () => {
    setIsSubmitting(true);
    try {
      if (gap.suggested_content_type === 'qa') {
        // Create Q&A
        await base44.entities.CuratedQA.create({
          question: title,
          answer: content,
          tags: gap.suggested_tags || [],
          status: 'pending_review',
          owner_id: user?.id,
          owner_name: user?.full_name
        });
      } else {
        // Create Document
        await base44.entities.Document.create({
          title,
          content,
          type: 'md',
          tags: gap.suggested_tags || [],
          status: 'draft',
          version: 1,
          owner_id: user?.id,
          owner_name: user?.full_name
        });
      }

      // Mark gap as addressed
      await base44.entities.ContentGap.update(gap.id, {
        status: 'addressed',
        assigned_to: user?.id,
        assigned_name: user?.full_name
      });

      queryClient.invalidateQueries({ queryKey: ["contentGaps"] });
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["curatedQAs"] });
      
      toast.success('Content created successfully');
      onClose();
    } catch (error) {
      toast.error('Failed to create content');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={!!gap} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Create {gap.suggested_content_type === 'qa' ? 'Q&A' : 'Document'} for Gap
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">
              {gap.suggested_content_type === 'qa' ? 'Question' : 'Title'}
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">
              {gap.suggested_content_type === 'qa' ? 'Answer' : 'Content'}
            </label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={`Write your ${gap.suggested_content_type === 'qa' ? 'answer' : 'content'} here...`}
              className="min-h-[200px]"
            />
          </div>
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-xs text-blue-800 font-medium mb-1">Context from gap analysis:</p>
            <p className="text-xs text-blue-700">{gap.description}</p>
            {gap.query_examples && gap.query_examples.length > 0 && (
              <p className="text-xs text-blue-600 mt-2">
                Example query: "{gap.query_examples[0]}"
              </p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleCreate}
            disabled={isSubmitting || !title.trim() || !content.trim()}
          >
            {isSubmitting ? 'Creating...' : `Create ${gap.suggested_content_type === 'qa' ? 'Q&A' : 'Document'}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}