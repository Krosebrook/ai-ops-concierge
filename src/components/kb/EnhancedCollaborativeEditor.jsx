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
  Clock,
  AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const USER_COLORS = [
  'rgb(239, 68, 68)', // red
  'rgb(59, 130, 246)', // blue
  'rgb(34, 197, 94)', // green
  'rgb(168, 85, 247)', // purple
  'rgb(249, 115, 22)', // orange
];

export default function EnhancedCollaborativeEditor({ document, onSave, onClose, user }) {
  const [title, setTitle] = useState(document?.title || "");
  const [content, setContent] = useState(document?.content || "");
  const [presences, setPresences] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [hasConflict, setHasConflict] = useState(false);
  const saveTimeoutRef = useRef(null);
  const textareaRef = useRef(null);
  const presenceIntervalRef = useRef(null);

  // Real-time presence tracking
  useEffect(() => {
    if (!document?.id || !user) return;

    const myColor = USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)];

    // Update my presence
    const updatePresence = async () => {
      try {
        const existing = await base44.entities.EditorPresence.filter({ 
          document_id: document.id,
          user_id: user.id 
        });

        const presenceData = {
          document_id: document.id,
          user_id: user.id,
          user_name: user.full_name,
          cursor_position: cursorPosition,
          last_seen: new Date().toISOString(),
          color: myColor
        };

        if (existing.length > 0) {
          await base44.entities.EditorPresence.update(existing[0].id, presenceData);
        } else {
          await base44.entities.EditorPresence.create(presenceData);
        }
      } catch (error) {
        console.error("Failed to update presence:", error);
      }
    };

    // Subscribe to presence changes
    const unsubscribe = base44.entities.EditorPresence.subscribe((event) => {
      if (event.data?.document_id === document.id) {
        loadPresences();
      }
    });

    // Load presences
    const loadPresences = async () => {
      try {
        const allPresences = await base44.entities.EditorPresence.filter({ 
          document_id: document.id 
        });
        
        // Filter out stale presences (older than 30 seconds)
        const activePresences = allPresences.filter(p => {
          const lastSeen = new Date(p.last_seen);
          const now = new Date();
          return (now - lastSeen) < 30000 && p.user_id !== user.id;
        });
        
        setPresences(activePresences);
      } catch (error) {
        console.error("Failed to load presences:", error);
      }
    };

    updatePresence();
    loadPresences();

    presenceIntervalRef.current = setInterval(() => {
      updatePresence();
      loadPresences();
    }, 5000);

    return () => {
      clearInterval(presenceIntervalRef.current);
      unsubscribe();
      // Clean up presence on unmount
      base44.entities.EditorPresence.filter({ 
        document_id: document.id,
        user_id: user.id 
      }).then(existing => {
        if (existing.length > 0) {
          base44.entities.EditorPresence.delete(existing[0].id);
        }
      });
    };
  }, [document?.id, user, cursorPosition]);

  const handleContentChange = (newContent, newCursor) => {
    setContent(newContent);
    setCursorPosition(newCursor);
    
    // Detect potential conflicts
    if (presences.some(p => Math.abs(p.cursor_position - newCursor) < 50)) {
      setHasConflict(true);
      setTimeout(() => setHasConflict(false), 3000);
    }
    
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
      {/* Header with real-time collaborators */}
      <Card className="p-4 bg-gradient-to-r from-violet-50 to-purple-50 border-violet-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-violet-600 flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">Real-Time Collaborative Editing</h3>
              <p className="text-xs text-slate-600">
                {presences.length > 0 ? `${presences.length} other ${presences.length === 1 ? 'editor' : 'editors'} active` : 'You are editing alone'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Real-time presence indicators */}
            {presences.map((presence) => (
              <div key={presence.id} className="relative group">
                <Avatar 
                  className="h-8 w-8 border-2" 
                  style={{ borderColor: presence.color }}
                >
                  <AvatarFallback 
                    className="text-white text-xs font-semibold"
                    style={{ backgroundColor: presence.color }}
                  >
                    {presence.user_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                
                {/* Tooltip on hover */}
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block">
                  <div className="bg-slate-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                    {presence.user_name}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Conflict warning */}
      {hasConflict && (
        <Card className="p-3 bg-amber-50 border-amber-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <p className="text-sm text-amber-800">
              Another editor is working nearby. Be careful to avoid conflicts.
            </p>
          </div>
        </Card>
      )}

      {/* Editor */}
      <Card className="p-4 relative">
        <div className="space-y-4">
          <Input
            placeholder="Document title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-lg font-semibold"
          />
          
          <div className="relative">
            <Textarea
              ref={textareaRef}
              placeholder="Document content..."
              value={content}
              onChange={(e) => {
                const target = e.target;
                handleContentChange(e.target.value, target.selectionStart);
              }}
              onSelect={(e) => {
                const target = e.target;
                setCursorPosition(target.selectionStart);
              }}
              className="min-h-[400px] font-mono text-sm"
            />
            
            {/* Cursor indicators for other editors */}
            {presences.map((presence) => {
              const lines = content.substring(0, presence.cursor_position).split('\n');
              const lineNumber = lines.length;
              const topOffset = (lineNumber - 1) * 24; // Approximate line height
              
              return (
                <div
                  key={presence.id}
                  className="absolute pointer-events-none"
                  style={{
                    top: `${topOffset}px`,
                    left: '12px',
                    borderLeft: `2px solid ${presence.color}`,
                    height: '20px'
                  }}
                >
                  <div 
                    className="absolute -top-5 left-0 text-xs px-1.5 py-0.5 rounded text-white whitespace-nowrap"
                    style={{ backgroundColor: presence.color }}
                  >
                    {presence.user_name.split(' ')[0]}
                  </div>
                </div>
              );
            })}
          </div>

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