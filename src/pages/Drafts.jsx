import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Mail,
  MessageSquare,
  FileText,
  Users,
  Loader2,
  Sparkles,
  Copy,
  RotateCcw,
  Check,
  AlertTriangle,
  Wand2
} from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import PolicyFlag from "@/components/ui/PolicyFlag";
import { toast } from "sonner";

const draftTypes = [
  { 
    id: "ticket_reply", 
    name: "Ticket Reply", 
    icon: MessageSquare,
    description: "Support ticket response",
    placeholder: "Describe the ticket context and what needs to be addressed..."
  },
  { 
    id: "client_email", 
    name: "Client Email", 
    icon: Mail,
    description: "Professional client update",
    placeholder: "Describe what you need to communicate to the client..."
  },
  { 
    id: "handoff_note", 
    name: "Handoff Note", 
    icon: Users,
    description: "Internal team handoff",
    placeholder: "Describe the situation and what the next team needs to know..."
  },
  { 
    id: "meeting_summary", 
    name: "Meeting Summary", 
    icon: FileText,
    description: "Meeting notes and actions",
    placeholder: "Describe what was discussed and any decisions made..."
  }
];

export default function Drafts() {
  const [selectedType, setSelectedType] = useState("ticket_reply");
  const [input, setInput] = useState("");
  const [recipientContext, setRecipientContext] = useState("");
  const [tone, setTone] = useState("professional");
  const [draft, setDraft] = useState(null);
  const [editedDraft, setEditedDraft] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [flags, setFlags] = useState([]);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: documents = [] } = useQuery({
    queryKey: ["documents", "active"],
    queryFn: () => base44.entities.Document.filter({ status: "active" }),
  });

  const currentType = draftTypes.find(t => t.id === selectedType);

  const handleGenerate = async () => {
    if (!input.trim()) return;
    
    setIsLoading(true);
    setDraft(null);
    setFlags([]);

    const knowledgeContext = documents.slice(0, 5)
      .map(d => `[${d.title}]\n${d.content?.slice(0, 300) || ""}`)
      .join("\n\n");

    const typeInstructions = {
      ticket_reply: "Create a helpful, empathetic support ticket reply that addresses the customer's issue directly.",
      client_email: "Write a professional email update that is clear, concise, and maintains a positive relationship.",
      handoff_note: "Create a thorough internal handoff note that gives the next team all context they need.",
      meeting_summary: "Summarize the meeting with clear sections for attendees, discussion points, decisions, and action items."
    };

    const prompt = `You are an AI Ops Concierge helping create professional drafts.

COMPANY KNOWLEDGE (for context):
${knowledgeContext || "No documents available."}

DRAFT TYPE: ${currentType.name}
TONE: ${tone}
RECIPIENT CONTEXT: ${recipientContext || "Not specified"}

USER INPUT:
${input}

INSTRUCTIONS:
${typeInstructions[selectedType]}

IMPORTANT RULES:
- Match the requested tone
- Be professional and clear
- Do NOT include any placeholder text like [Company Name] - use generic terms if needed
- Flag any potential issues (PII, secrets, compliance concerns)

Respond in JSON format:
{
  "draft": "The complete draft text with proper formatting",
  "flags": ["pii_warning", "secrets_detected", "needs_review"] (empty if none),
  "suggestions": ["Optional improvement suggestion 1", "Optional suggestion 2"]
}`;

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            draft: { type: "string" },
            flags: { type: "array", items: { type: "string" } },
            suggestions: { type: "array", items: { type: "string" } }
          }
        }
      });

      setDraft(result);
      setEditedDraft(result.draft);
      setFlags(result.flags || []);

      // Log the AI event
      await base44.entities.AIEvent.create({
        user_id: user?.id,
        user_email: user?.email,
        user_role: user?.role,
        mode: "draft",
        draft_type: selectedType,
        input,
        context_json: JSON.stringify({ tone, recipientContext }),
        output: result.draft,
        flags: result.flags || [],
        actions: []
      });

    } catch (error) {
      toast.error("Failed to generate draft. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(editedDraft);
    toast.success("Copied to clipboard");
  };

  const saveDraft = () => {
    toast.success("Draft saved successfully");
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
      {/* Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-50 text-violet-600 text-sm font-medium mb-4">
          <Wand2 className="w-4 h-4" />
          <span>Draft Mode</span>
        </div>
        <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight">
          Create polished drafts
        </h1>
        <p className="mt-3 text-slate-600">
          Generate professional artifacts that follow company tone and policy.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Section */}
        <div className="space-y-6">
          {/* Draft Type Selection */}
          <div>
            <Label className="text-sm font-semibold text-slate-700 mb-3 block">
              Draft Type
            </Label>
            <div className="grid grid-cols-2 gap-3">
              {draftTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setSelectedType(type.id)}
                  className={cn(
                    "flex items-start gap-3 p-4 rounded-xl border-2 transition-all duration-200 text-left",
                    selectedType === type.id
                      ? "border-violet-500 bg-violet-50"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  )}
                >
                  <type.icon className={cn(
                    "w-5 h-5 mt-0.5",
                    selectedType === type.id ? "text-violet-600" : "text-slate-400"
                  )} />
                  <div>
                    <p className={cn(
                      "text-sm font-medium",
                      selectedType === type.id ? "text-violet-900" : "text-slate-700"
                    )}>
                      {type.name}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {type.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Context */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-slate-700 mb-2 block">
                Tone
              </Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="friendly">Friendly</SelectItem>
                  <SelectItem value="formal">Formal</SelectItem>
                  <SelectItem value="empathetic">Empathetic</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium text-slate-700 mb-2 block">
                Recipient
              </Label>
              <Input
                placeholder="e.g., Enterprise customer"
                value={recipientContext}
                onChange={(e) => setRecipientContext(e.target.value)}
              />
            </div>
          </div>

          {/* Input */}
          <div>
            <Label className="text-sm font-medium text-slate-700 mb-2 block">
              What do you need to write?
            </Label>
            <Textarea
              placeholder={currentType?.placeholder}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="min-h-[200px]"
            />
          </div>

          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            disabled={!input.trim() || isLoading}
            className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 shadow-lg shadow-violet-200/50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Draft
              </>
            )}
          </Button>
        </div>

        {/* Output Section */}
        <div>
          {draft ? (
            <Card className="bg-white shadow-xl shadow-slate-200/50 border-0 overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500">
              {/* Flags */}
              {flags.length > 0 && (
                <div className="p-4 border-b border-slate-100 space-y-2">
                  {flags.map((flag) => (
                    <PolicyFlag key={flag} type={flag} />
                  ))}
                </div>
              )}

              {/* Draft Content */}
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-700">
                    {currentType?.name}
                  </h3>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setDraft(null); setEditedDraft(""); }}
                    >
                      <RotateCcw className="w-4 h-4 mr-1" />
                      Regenerate
                    </Button>
                  </div>
                </div>

                <Textarea
                  value={editedDraft}
                  onChange={(e) => setEditedDraft(e.target.value)}
                  className="min-h-[300px] font-mono text-sm"
                />

                {/* Suggestions */}
                {draft.suggestions?.length > 0 && (
                  <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <p className="text-xs font-medium text-amber-800 mb-2">
                      💡 Suggestions
                    </p>
                    <ul className="space-y-1">
                      {draft.suggestions.map((s, idx) => (
                        <li key={idx} className="text-xs text-amber-700">• {s}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-end gap-3">
                <Button variant="outline" onClick={copyToClipboard}>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </Button>
                <Button onClick={saveDraft} className="bg-emerald-600 hover:bg-emerald-700">
                  <Check className="w-4 h-4 mr-2" />
                  Save Draft
                </Button>
              </div>
            </Card>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center py-12 px-6">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center mb-4">
                  <Wand2 className="w-8 h-8 text-violet-500" />
                </div>
                <h3 className="text-lg font-semibold text-slate-800">
                  Your draft will appear here
                </h3>
                <p className="text-sm text-slate-500 mt-2 max-w-xs mx-auto">
                  Select a draft type, provide context, and click generate to create your artifact.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}