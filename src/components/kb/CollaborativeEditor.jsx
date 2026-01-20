import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Users, 
  Save, 
  Sparkles, 
  Loader2, 
  CheckCircle,
  Clock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function CollaborativeEditor({ document, onSave, onClose }) {
  const [title, setTitle] = useState(document?.title || "");
  const [content, setContent] = useState(document?.content || "");
  const [collaborators, setCollaborators] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const saveTimeoutRef = useRef(null);

  useEffect(() => {
    // Simulate real-time presence (in production, use WebSocket/real-time DB)
    const checkCollaborators = async () => {
      try {
        const users = await base44.entities.User.list();
        const activeCollaborators = users
          .filter(u => document?.collaborators?.includes(u.id))
          .map(u => ({
            id: u.id,
            name: u.full_name,
            email: u.email,
            active: true
          }));
        setCollaborators(activeCollaborators);
      } catch (error) {
        console.error("Failed to fetch collaborators:", error);
      }
    };

    if (document?.is_collaborative) {
      checkCollaborators();
      const interval = setInterval(checkCollaborators, 30000); // 30s
      return () => clearInterval(interval);
    }
  }, [document]);

  const handleContentChange = (newContent) => {
    setContent(newContent);
    
    // Auto-save after 2 seconds of no typing
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      handleSave(false);
    }, 2000);
  };

  const getAISuggestions = async () => {
    setIsAnalyzing(true);
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze this document content and provide suggestions to improve clarity and consistency.

Title: ${title}
Content: ${content}

Provide 3 specific, actionable suggestions for improvement. Focus on:
- Clarity and readability
- Consistency in terminology
- Structure and organization

Return JSON with array of suggestions.`,
        response_json_schema: {
          type: "object",
          properties: {
            suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: { type: "string" },
                  suggestion: { type: "string" },
                  priority: { type: "string" }
                }
              }
            }
          }
        }
      });

      setAiSuggestion(response.suggestions || []);
      toast.success("AI suggestions generated");
    } catch (error) {
      toast.error("Failed to generate suggestions");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSave = async (showToast = true) => {
    setIsSaving(true);
    try {
      const updatedDoc = await base44.entities.Document.update(document.id, {
        title,
        content,
        version: (document.version || 1) + 1,
        previous_version_id: document.id
      });

      if (showToast) {
        toast.success("Document saved");
      }
      
      onSave?.(updatedDoc);
    } catch (error) {
      toast.error("Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with collaborators */}
      <Card className="p-4 bg-gradient-to-r from-violet-50 to-purple-50 border-violet-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-violet-600 flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">Collaborative Editing</h3>
              <p className="text-xs text-slate-600">
                {collaborators.length} active {collaborators.length === 1 ? 'editor' : 'editors'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Presence indicators */}
            {collaborators.slice(0, 3).map((collab) => (
              <div key={collab.id} className="relative">
                <Avatar className="h-8 w-8 border-2 border-white">
                  <AvatarFallback className="bg-violet-600 text-white text-xs">
                    {collab.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
              </div>
            ))}
            {collaborators.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{collaborators.length - 3}
              </Badge>
            )}
          </div>
        </div>
      </Card>

      {/* Editor */}
      <Card className="p-4">
        <div className="space-y-4">
          <Input
            placeholder="Document title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-lg font-semibold"
          />
          
          <Textarea
            placeholder="Document content..."
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            className="min-h-[400px] font-mono text-sm"
          />

          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              {isSaving ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-3 h-3 text-green-600" />
                  <span>All changes saved</span>
                </>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={getAISuggestions}
                disabled={isAnalyzing || !content.trim()}
                className="gap-2"
              >
                <Sparkles className="w-4 h-4" />
                {isAnalyzing ? "Analyzing..." : "AI Suggestions"}
              </Button>
              <Button
                onClick={() => handleSave(true)}
                disabled={isSaving}
                className="bg-violet-600 hover:bg-violet-700"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Version
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* AI Suggestions */}
      {aiSuggestion && aiSuggestion.length > 0 && (
        <Card className="p-4 bg-blue-50 border-blue-200">
          <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            AI Suggestions for Improvement
          </h4>
          <div className="space-y-2">
            {aiSuggestion.map((sug, idx) => (
              <div key={idx} className="p-3 bg-white rounded-lg border border-blue-200">
                <div className="flex items-start gap-2">
                  <Badge 
                    className={cn(
                      "text-xs mt-0.5",
                      sug.priority === "high" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
                    )}
                  >
                    {sug.type}
                  </Badge>
                  <p className="text-sm text-slate-700 flex-1">{sug.suggestion}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}