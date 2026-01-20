import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AIAssistant from "@/components/kb/AIAssistant";
import ContentAnalysis from "@/components/kb/ContentAnalysis";
import ForYouFeed from "@/components/kb/ForYouFeed";
import ContentGaps from "@/components/kb/ContentGaps";
import CollaborativeEditor from "@/components/kb/CollaborativeEditor";
import VersionHistory from "@/components/kb/VersionHistory";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Library,
  FileText,
  HelpCircle,
  Plus,
  Search,
  Upload,
  MoreVertical,
  Archive,
  Trash2,
  Edit,
  Clock,
  User,
  CheckCircle,
  XCircle,
  Loader2,
  Sparkles,
  Globe,
  Zap,
  Bot,
  BarChart3,
  TrendingUp
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import TagBadge from "@/components/ui/TagBadge";
import SemanticSearch from "@/components/search/SemanticSearch";
import { toast } from "sonner";

const DOMAIN_TAGS = ["Support", "Ops", "Sales", "Compliance"];

export default function KnowledgeBase() {
  const [activeTab, setActiveTab] = useState("foryou");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState([]);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showQADialog, setShowQADialog] = useState(false);
  const [showSemanticSearch, setShowSemanticSearch] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [user, setUser] = useState(null);
  const [userPermissions, setUserPermissions] = useState([]);
  const [editingDocument, setEditingDocument] = useState(null);
  const [viewingVersions, setViewingVersions] = useState(null);

  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(async (u) => {
      setUser(u);
      // Get user permissions from custom role
      if (u.custom_role_id) {
        const roles = await base44.entities.CustomRole.filter({ id: u.custom_role_id });
        if (roles[0]) {
          setUserPermissions(roles[0].permissions || []);
        }
      } else if (u.permissions) {
        setUserPermissions(u.permissions);
      } else if (u.role === 'admin') {
        setUserPermissions(['*']); // Admin has all permissions
      }
    }).catch(() => {});
  }, []);

  const hasPermission = (permission) => {
    if (user?.role === 'admin') return true;
    return userPermissions.includes('*') || userPermissions.includes(permission);
  };

  const { data: documents = [], isLoading: docsLoading } = useQuery({
    queryKey: ["documents"],
    queryFn: () => base44.entities.Document.list("-created_date"),
  });

  const { data: curatedQAs = [], isLoading: qasLoading } = useQuery({
    queryKey: ["curatedQAs"],
    queryFn: () => base44.entities.CuratedQA.list("-created_date"),
  });

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch = !searchQuery || 
      doc.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.content?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTags = selectedTags.length === 0 || 
      selectedTags.some(tag => doc.tags?.includes(tag));
    return matchesSearch && matchesTags && doc.status === "active";
  });

  const filteredQAs = curatedQAs.filter((qa) => {
    const matchesSearch = !searchQuery || 
      qa.question?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      qa.answer?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTags = selectedTags.length === 0 || 
      selectedTags.some(tag => qa.tags?.includes(tag));
    return matchesSearch && matchesTags;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-600 text-sm font-medium mb-4">
            <Library className="w-4 h-4" />
            <span>Knowledge Base</span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight">
            Knowledge Base
          </h1>
          <p className="mt-2 text-slate-600">
            Manage documents, SOPs, and curated Q&A pairs.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {hasPermission('create_qa') && (
            <Button
              variant="outline"
              onClick={() => setShowQADialog(true)}
            >
              <HelpCircle className="w-4 h-4 mr-2" />
              Add Q&A
            </Button>
          )}
          {hasPermission('upload_documents') && (
            <Button
              onClick={() => setShowUploadDialog(true)}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload Document
            </Button>
          )}
        </div>
      </div>

      {/* Search & Filters */}
      <div className="space-y-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search documents and Q&As..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setShowSemanticSearch(!showSemanticSearch)}
            className={cn(
              "gap-2",
              showSemanticSearch && "bg-violet-50 text-violet-700 border-violet-300"
            )}
          >
            <Sparkles className="w-4 h-4" />
            Semantic Search
          </Button>
        </div>

        {showSemanticSearch && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-300">
            <SemanticSearch 
              onResultClick={(item) => {
                setSelectedItem(item);
                setActiveTab(item.type === "document" ? "documents" : "qa");
                toast.info(`Viewing: ${item.title}`);
              }}
            />
          </div>
        )}

        {!showSemanticSearch && (
          <div className="flex items-center gap-2">
            {DOMAIN_TAGS.map((tag) => (
              <button
                key={tag}
                onClick={() => {
                  setSelectedTags(prev => 
                    prev.includes(tag) 
                      ? prev.filter(t => t !== tag) 
                      : [...prev, tag]
                  );
                }}
                className={cn(
                  "px-3 py-1.5 rounded-full text-sm font-medium border transition-all",
                  selectedTags.includes(tag)
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                )}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-100 p-1">
          <TabsTrigger value="foryou" className="gap-2">
            <Sparkles className="w-4 h-4" />
            For You
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-2">
            <FileText className="w-4 h-4" />
            Documents ({documents.filter(d => d.status === "active").length})
          </TabsTrigger>
          <TabsTrigger value="qa" className="gap-2">
            <HelpCircle className="w-4 h-4" />
            Curated Q&A ({curatedQAs.length})
          </TabsTrigger>
          <TabsTrigger value="assistant" className="gap-2">
            <Bot className="w-4 h-4" />
            AI Assistant
          </TabsTrigger>
          {hasPermission('review_ai_suggestions') && (
            <TabsTrigger value="gaps" className="gap-2">
              <TrendingUp className="w-4 h-4" />
              Content Gaps
            </TabsTrigger>
          )}
          {user?.role === "admin" && (
            <TabsTrigger value="analysis" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              Content Analysis
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="foryou" className="mt-6">
          <ForYouFeed onItemClick={(item) => {
            if (item.type === "document") {
              setActiveTab("documents");
            } else {
              setActiveTab("qa");
            }
          }} />
        </TabsContent>

        <TabsContent value="documents" className="mt-6">
          {docsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : filteredDocuments.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No documents yet"
              description="Upload your first document to start building your knowledge base."
              action={{ label: "Upload Document", onClick: () => setShowUploadDialog(true) }}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDocuments.map((doc) => (
                <DocumentCard 
                  key={doc.id} 
                  document={doc} 
                  queryClient={queryClient}
                  onEdit={() => setEditingDocument(doc)}
                  onViewVersions={() => setViewingVersions(doc)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="qa" className="mt-6">
          {qasLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : filteredQAs.length === 0 ? (
            <EmptyState
              icon={HelpCircle}
              title="No Q&A pairs yet"
              description="Add curated Q&A pairs to help the AI answer common questions."
              action={{ label: "Add Q&A", onClick: () => setShowQADialog(true) }}
            />
          ) : (
            <div className="space-y-4">
              {filteredQAs.map((qa) => (
                <QACard key={qa.id} qa={qa} user={user} queryClient={queryClient} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="assistant" className="mt-6">
          <AIAssistant />
        </TabsContent>

        <TabsContent value="gaps" className="mt-6">
          <ContentGaps user={user} hasPermission={hasPermission} />
        </TabsContent>

        {user?.role === "admin" && (
          <TabsContent value="analysis" className="mt-6">
            <ContentAnalysis />
          </TabsContent>
        )}
      </Tabs>

      {/* Upload Dialog */}
      <UploadDialog 
        open={showUploadDialog} 
        onOpenChange={setShowUploadDialog}
        user={user}
        canPublish={hasPermission('publish_documents')}
        queryClient={queryClient}
      />

      {/* Q&A Dialog */}
      <QAFormDialog
        open={showQADialog}
        onOpenChange={setShowQADialog}
        user={user}
        queryClient={queryClient}
      />

      {/* Collaborative Editor Dialog */}
      <Dialog open={!!editingDocument} onOpenChange={() => setEditingDocument(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Document</DialogTitle>
          </DialogHeader>
          {editingDocument && (
            <CollaborativeEditor
              document={editingDocument}
              onSave={(updated) => {
                queryClient.invalidateQueries(["documents"]);
                setEditingDocument(null);
              }}
              onClose={() => setEditingDocument(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Version History Dialog */}
      <Dialog open={!!viewingVersions} onOpenChange={() => setViewingVersions(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Version History</DialogTitle>
          </DialogHeader>
          {viewingVersions && (
            <VersionHistory
              documentId={viewingVersions.id}
              onRevert={() => {
                queryClient.invalidateQueries(["documents"]);
                setViewingVersions(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DocumentCard({ document, queryClient, onEdit, onViewVersions }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const archiveMutation = useMutation({
    mutationFn: () => base44.entities.Document.update(document.id, { status: "archived" }),
    onSuccess: () => {
      queryClient.invalidateQueries(["documents"]);
      toast.success("Document archived");
    }
  });

  const toggleExternalMutation = useMutation({
    mutationFn: () => base44.entities.Document.update(document.id, { 
      external_approved: !document.external_approved 
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(["documents"]);
      toast.success(document.external_approved ? "Removed from client portal" : "Approved for client portal");
    }
  });

  const regenerateSummaryMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke("generateDocumentSummary", { 
        documentId: document.id 
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["documents"]);
      toast.success("AI summary regenerated");
    },
    onError: () => {
      toast.error("Failed to regenerate summary");
    }
  });

  return (
    <Card className="bg-white hover:shadow-md transition-shadow group">
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
              <FileText className="w-5 h-5 text-slate-500" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 line-clamp-1">
                {document.title}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                v{document.version || 1} • {document.type?.toUpperCase()}
              </p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onViewVersions}>
                <Clock className="w-4 h-4 mr-2" />
                Version History
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => regenerateSummaryMutation.mutate()}
                disabled={regenerateSummaryMutation.isPending}
              >
                <Zap className="w-4 h-4 mr-2" />
                {regenerateSummaryMutation.isPending ? "Generating..." : "Regenerate AI Summary"}
              </DropdownMenuItem>
              {user?.role === "admin" && (
                <DropdownMenuItem onClick={() => toggleExternalMutation.mutate()}>
                  <Globe className="w-4 h-4 mr-2" />
                  {document.external_approved ? "Remove from Client Portal" : "Approve for Client Portal"}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => archiveMutation.mutate()}>
                <Archive className="w-4 h-4 mr-2" />
                Archive
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {document.ai_summary && (
          <div className="mt-3 p-3 bg-gradient-to-r from-violet-50 to-purple-50 rounded-lg border border-violet-100">
            <div className="flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-violet-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-700 leading-relaxed">{document.ai_summary}</p>
              </div>
            </div>
          </div>
        )}

        {document.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-4">
            {document.tags.map((tag) => (
              <TagBadge key={tag} tag={tag} />
            ))}
          </div>
        )}

        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-100 text-xs text-slate-500">
          <div className="flex items-center gap-1">
            <User className="w-3 h-3" />
            <span>{document.owner_name || "Unknown"}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{format(new Date(document.created_date), "MMM d, yyyy")}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}

function QACard({ qa, user, queryClient }) {
  const [canApprove, setCanApprove] = useState(false);

  useEffect(() => {
    const checkPermission = async () => {
      if (user?.role === 'admin') {
        setCanApprove(true);
        return;
      }
      if (user?.custom_role_id) {
        const roles = await base44.entities.CustomRole.filter({ id: user.custom_role_id });
        if (roles[0]) {
          setCanApprove(roles[0].permissions?.includes('approve_qa'));
        }
      }
    };
    checkPermission();
  }, [user]);

  const approveMutation = useMutation({
    mutationFn: () => base44.entities.CuratedQA.update(qa.id, { 
      status: "approved",
      reviewer_id: user?.id,
      reviewer_name: user?.full_name,
      reviewed_at: new Date().toISOString()
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(["curatedQAs"]);
      toast.success("Q&A approved");
    }
  });

  const rejectMutation = useMutation({
    mutationFn: () => base44.entities.CuratedQA.update(qa.id, { 
      status: "rejected",
      reviewer_id: user?.id,
      reviewer_name: user?.full_name,
      reviewed_at: new Date().toISOString()
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(["curatedQAs"]);
      toast.success("Q&A rejected");
    }
  });

  const statusColors = {
    draft: "bg-slate-100 text-slate-700",
    pending_review: "bg-amber-100 text-amber-800",
    approved: "bg-emerald-100 text-emerald-800",
    rejected: "bg-red-100 text-red-800"
  };

  return (
    <Card className="bg-white hover:shadow-md transition-shadow">
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Badge className={statusColors[qa.status]}>
                {qa.status?.replace("_", " ")}
              </Badge>
              {qa.tags?.map((tag) => (
                <TagBadge key={tag} tag={tag} />
              ))}
            </div>
            <h3 className="font-semibold text-slate-800">
              Q: {qa.question}
            </h3>
            <p className="text-sm text-slate-600 mt-2 line-clamp-3">
              A: {qa.answer}
            </p>
          </div>

          {qa.status === "pending_review" && canApprove && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => rejectMutation.mutate()}
                className="text-red-600 hover:text-red-700"
              >
                <XCircle className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                onClick={() => approveMutation.mutate()}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Approve
              </Button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-100 text-xs text-slate-500">
          <div className="flex items-center gap-1">
            <User className="w-3 h-3" />
            <span>{qa.owner_name || "Unknown"}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{format(new Date(qa.created_date), "MMM d, yyyy")}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}

function UploadDialog({ open, onOpenChange, user, canPublish, queryClient }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [fileType, setFileType] = useState("md");
  const [tags, setTags] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [autoTagging, setAutoTagging] = useState(false);

  const handleAutoTag = async () => {
    if (!title.trim() || !content.trim()) return;
    
    setAutoTagging(true);
    try {
      // Create temporary doc for analysis
      const tempDoc = await base44.entities.Document.create({
        title,
        content,
        type: fileType,
        status: "active",
        version: 1,
        owner_id: user?.id,
        owner_name: user?.full_name
      });

      const response = await base44.functions.invoke("analyzeDocument", {
        documentId: tempDoc.id,
        analysisType: "auto_tag"
      });

      setTags(response.data.suggested_tags || []);
      
      // Delete temp doc
      await base44.entities.Document.delete(tempDoc.id);
      
      toast.success("AI tags suggested");
    } catch (error) {
      toast.error("Auto-tagging failed");
    } finally {
      setAutoTagging(false);
    }
  };

  const handleUpload = async () => {
    if (!title.trim() || !content.trim()) return;
    
    setIsUploading(true);
    try {
      const newDoc = await base44.entities.Document.create({
        title,
        content,
        type: fileType,
        tags,
        status: canPublish ? "active" : "draft",
        version: 1,
        owner_id: user?.id,
        owner_name: user?.full_name,
        is_external: isExternal,
        external_url: isExternal ? externalUrl : undefined
      });

      const message = canPublish 
        ? "Document published successfully" 
        : "Document submitted for review";
      
      // Generate AI summary in background
      if (canPublish) {
        toast.promise(
          base44.functions.invoke("generateDocumentSummary", { documentId: newDoc.id }),
          {
            loading: "Generating AI summary...",
            success: message + " with AI summary",
            error: message + " but summary failed"
          }
        );
      } else {
        toast.success(message);
      }

      queryClient.invalidateQueries(["documents"]);
      onOpenChange(false);
      setTitle("");
      setContent("");
      setTags([]);
      setIsExternal(false);
      setExternalUrl("");
    } catch (error) {
      toast.error("Failed to upload document");
    } finally {
      setIsUploading(false);
    }
  };

  const [isExternal, setIsExternal] = useState(false);
  const [externalUrl, setExternalUrl] = useState("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <input
              type="checkbox"
              id="is_external"
              checked={isExternal}
              onChange={(e) => setIsExternal(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="is_external" className="text-sm text-blue-800 cursor-pointer flex items-center gap-1">
              <Globe className="w-4 h-4" />
              This is external/public documentation
            </label>
          </div>

          {isExternal && (
            <div>
              <Label>External URL (optional)</Label>
              <Input
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                placeholder="https://docs.example.com/guide"
              />
            </div>
          )}

          <div>
            <Label>Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Refund Policy SOP"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Type</Label>
              <Select value={fileType} onValueChange={setFileType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="md">Markdown</SelectItem>
                  <SelectItem value="txt">Text</SelectItem>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="docx">Word</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Tags</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleAutoTag}
                  disabled={!title.trim() || !content.trim() || autoTagging}
                  className="text-xs gap-1 h-7"
                >
                  <Sparkles className="w-3 h-3" />
                  {autoTagging ? "Analyzing..." : "AI Suggest"}
                </Button>
              </div>
              <Select 
                value={tags[0] || ""} 
                onValueChange={(v) => setTags(prev => prev.includes(v) ? prev : [...prev, v])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Add tags" />
                </SelectTrigger>
                <SelectContent>
                  {DOMAIN_TAGS.map((tag) => (
                    <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <TagBadge 
                  key={tag} 
                  tag={tag} 
                  onRemove={() => setTags(tags.filter(t => t !== tag))}
                />
              ))}
            </div>
          )}
          <div>
            <Label>Content</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste or write your document content..."
              className="min-h-[200px]"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleUpload} 
            disabled={isUploading || !title.trim() || !content.trim()}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              "Upload"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function QAFormDialog({ open, onOpenChange, user, queryClient }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [tags, setTags] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!question.trim() || !answer.trim()) return;
    
    setIsSubmitting(true);
    try {
      // Check if user has approve_qa permission via custom role
      let canApprove = user?.role === "admin";
      if (user?.custom_role_id) {
        const roles = await base44.entities.CustomRole.filter({ id: user.custom_role_id });
        if (roles[0]) {
          canApprove = roles[0].permissions?.includes('approve_qa');
        }
      }

      await base44.entities.CuratedQA.create({
        question,
        answer,
        tags,
        status: canApprove ? "approved" : "pending_review",
        owner_id: user?.id,
        owner_name: user?.full_name
      });
      
      queryClient.invalidateQueries(["curatedQAs"]);
      toast.success("Q&A created successfully");
      onOpenChange(false);
      setQuestion("");
      setAnswer("");
      setTags([]);
    } catch (error) {
      toast.error("Failed to create Q&A");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Curated Q&A</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label>Question</Label>
            <Input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g., How do we handle enterprise refund requests?"
            />
          </div>
          <div>
            <Label>Tags</Label>
            <Select 
              value={tags[0] || ""} 
              onValueChange={(v) => setTags(prev => prev.includes(v) ? prev : [...prev, v])}
            >
              <SelectTrigger>
                <SelectValue placeholder="Add tags" />
              </SelectTrigger>
              <SelectContent>
                {DOMAIN_TAGS.map((tag) => (
                  <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <TagBadge 
                  key={tag} 
                  tag={tag} 
                  onRemove={() => setTags(tags.filter(t => t !== tag))}
                />
              ))}
            </div>
          )}
          <div>
            <Label>Answer</Label>
            <Textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Provide the curated answer..."
              className="min-h-[150px]"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || !question.trim() || !answer.trim()}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Q&A"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="text-center py-16">
      <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-slate-400" />
      </div>
      <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
      <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto">{description}</p>
      {action && (
        <Button onClick={action.onClick} className="mt-6">
          <Plus className="w-4 h-4 mr-2" />
          {action.label}
        </Button>
      )}
    </div>
  );
}