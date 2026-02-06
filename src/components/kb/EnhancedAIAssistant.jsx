import { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Sparkles, 
  Send, 
  Loader2, 
  Bot, 
  User as UserIcon, 
  FileText, 
  MessageSquare,
  Upload,
  X,
  Image as ImageIcon,
  File,
  History,
  Lightbulb
} from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import SuggestionsPanel from "./SuggestionsPanel";

export default function EnhancedAIAssistant({ user }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [currentThreadId, setCurrentThreadId] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load existing threads
  const { data: threads = [] } = useQuery({
    queryKey: ["conversationThreads", user?.id],
    queryFn: () => base44.entities.ConversationThread.filter({ user_id: user?.id }, "-last_message_at", 10),
    enabled: !!user
  });

  // Load thread messages
  const loadThread = (thread) => {
    setCurrentThreadId(thread.id);
    setMessages(thread.messages || []);
    setShowSuggestions(false);
  };

  // Start new conversation
  const startNewConversation = () => {
    setCurrentThreadId(null);
    setMessages([]);
    setUploadedFiles([]);
    setShowSuggestions(true);
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    
    for (const file of files) {
      try {
        const response = await base44.integrations.Core.UploadFile({ file });
        setUploadedFiles(prev => [...prev, {
          name: file.name,
          url: response.file_url,
          type: file.type
        }]);
        toast.success(`${file.name} uploaded`);
      } catch (error) {
        toast.error(`Failed to upload ${file.name}`);
      }
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && uploadedFiles.length === 0) || isProcessing) return;

    const userMessage = { 
      role: "user", 
      content: input,
      file_urls: uploadedFiles.map(f => f.url),
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    const filesToProcess = [...uploadedFiles];
    setUploadedFiles([]);
    setIsProcessing(true);
    setShowSuggestions(false);

    try {
      // Fetch knowledge base with external sources
      const [documents, qas, externalDocs] = await Promise.all([
        base44.entities.Document.filter({ status: "active", is_external: false }),
        base44.entities.CuratedQA.filter({ status: "approved" }),
        base44.entities.Document.filter({ status: "active", is_external: true })
      ]);

      // Build conversation context
      const conversationContext = messages.slice(-6).map(m => 
        `${m.role === 'user' ? 'USER' : 'ASSISTANT'}: ${m.content}`
      ).join('\n');

      // Build knowledge context
      const knowledgeContext = [
        "INTERNAL KNOWLEDGE BASE:",
        ...documents.map(d => 
          `[DOC] ${d.title}\n${d.ai_summary || d.content?.substring(0, 300)}\nTags: ${d.tags?.join(", ")}`
        ),
        ...qas.map(qa =>
          `[Q&A] ${qa.question}\nA: ${qa.answer}`
        ),
        "\nEXTERNAL RESOURCES (public/industry):",
        ...externalDocs.map(d =>
          `[EXTERNAL] ${d.title}\nSource: ${d.external_url}\n${d.ai_summary || d.content?.substring(0, 200)}`
        )
      ].join("\n\n");

      const prompt = `You are a helpful AI assistant with access to internal knowledge base and external resources.

CONVERSATION HISTORY:
${conversationContext}

${knowledgeContext}

USER QUESTION: ${input}
${filesToProcess.length > 0 ? `\nAttached files: ${filesToProcess.map(f => f.name).join(', ')}` : ''}

Provide a clear, contextual answer considering the conversation history. Cite sources and distinguish between internal docs and external resources. If referencing previous conversation, acknowledge it.`;

      const response = await base44.integrations.Core.InvokeLLM({ 
        prompt,
        file_urls: filesToProcess.map(f => f.url)
      });

      // Generate related suggestions
      const suggestionsPrompt = `Based on this conversation, suggest 2-3 relevant follow-up questions or related topics the user might want to explore.

Conversation: ${input}
Answer: ${response.output}

Return JSON array of suggestions.`;

      const suggestionsResponse = await base44.integrations.Core.InvokeLLM({
        prompt: suggestionsPrompt,
        response_json_schema: {
          type: "object",
          properties: {
            suggestions: {
              type: "array",
              items: { type: "string" }
            }
          }
        }
      });

      const aiMessage = {
        role: "assistant",
        content: response.output || "I'm not sure how to answer that.",
        sources: [...documents.slice(0, 3).map(d => ({ id: d.id, title: d.title, type: 'internal' })),
                  ...externalDocs.slice(0, 2).map(d => ({ id: d.id, title: d.title, type: 'external', url: d.external_url }))],
        suggestions: suggestionsResponse.suggestions || [],
        timestamp: new Date().toISOString()
      };

      const updatedMessages = [...messages, userMessage, aiMessage];
      setMessages(updatedMessages);

      // Save or update conversation thread
      if (currentThreadId) {
        await base44.entities.ConversationThread.update(currentThreadId, {
          messages: updatedMessages,
          last_message_at: new Date().toISOString()
        });
      } else {
        const thread = await base44.entities.ConversationThread.create({
          user_id: user?.id,
          messages: updatedMessages,
          title: input.substring(0, 60),
          last_message_at: new Date().toISOString()
        });
        setCurrentThreadId(thread.id);
      }

      queryClient.invalidateQueries({ queryKey: ["conversationThreads"] });

    } catch (error) {
      console.error("AI error:", error);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
        error: true,
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const removeFile = (index) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDocumentClick = async (doc) => {
    // Track document view
    await base44.entities.DocumentView.create({
      document_id: doc.id,
      document_title: doc.title,
      user_id: user?.id,
      user_email: user?.email,
      source: "suggestion"
    });

    // Update view count
    await base44.entities.Document.update(doc.id, {
      view_count: (doc.view_count || 0) + 1
    });

    // Auto-fill a question about the document
    setInput(`Tell me about "${doc.title}"`);
    toast.success(`Document selected: ${doc.title}`);
  };

  const handleQuestionClick = (question) => {
    setInput(question);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Conversation History Sidebar */}
      <Card className="lg:col-span-1 p-4 h-[600px] overflow-y-auto">
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-slate-800 flex items-center gap-2">
              <History className="w-4 h-4" />
              History
            </h4>
            <Button size="sm" variant="outline" onClick={startNewConversation}>
              New
            </Button>
          </div>
          
          {threads.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">No conversations yet</p>
          ) : (
            threads.map((thread) => (
              <button
                key={thread.id}
                onClick={() => loadThread(thread)}
                className={cn(
                  "w-full text-left p-3 rounded-lg border transition-all",
                  currentThreadId === thread.id 
                    ? "bg-violet-50 border-violet-300" 
                    : "bg-white border-slate-200 hover:border-slate-300"
                )}
              >
                <p className="text-sm font-medium text-slate-800 line-clamp-2">
                  {thread.title || "Untitled conversation"}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {thread.messages?.length || 0} messages
                </p>
              </button>
            ))
          )}
        </div>
      </Card>

      {/* Main Chat */}
      <Card className="lg:col-span-2 flex flex-col h-[600px] bg-gradient-to-br from-slate-50 to-white border-violet-200">
        {/* Header */}
        <div className="px-4 py-3 border-b border-violet-200 bg-gradient-to-r from-violet-50 to-purple-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">Enhanced AI Assistant</h3>
                <p className="text-xs text-slate-600">
                  {currentThreadId ? "Continuing conversation" : "Start a new conversation"}
                </p>
              </div>
            </div>
            {currentThreadId && (
              <Button size="sm" variant="ghost" onClick={startNewConversation}>
                New Chat
              </Button>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-violet-100 flex items-center justify-center mb-4">
                <MessageSquare className="w-8 h-8 text-violet-600" />
              </div>
              <p className="text-sm text-slate-600 mb-2">Start a conversation</p>
              <p className="text-xs text-slate-500">Ask questions, upload files for analysis</p>
              
              {showSuggestions && (
                <div className="mt-6 space-y-2 max-w-md mx-auto">
                  <p className="text-xs font-medium text-slate-700 mb-3">Try asking:</p>
                  {["What are our refund policies?", "Summarize recent support trends", "How do we handle enterprise clients?"].map((q, i) => (
                    <button
                      key={i}
                      onClick={() => { setInput(q); setShowSuggestions(false); }}
                      className="block w-full text-left px-4 py-2 rounded-lg bg-white border border-slate-200 hover:border-violet-300 hover:bg-violet-50 text-sm text-slate-700 transition-all"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div
                key={idx}
                className={cn(
                  "flex gap-3",
                  msg.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                {msg.role === "assistant" && (
                  <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-violet-600" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-3",
                    msg.role === "user"
                      ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white"
                      : msg.error
                      ? "bg-red-50 border border-red-200 text-red-800"
                      : "bg-white border border-slate-200 text-slate-800"
                  )}
                >
                  {msg.role === "assistant" ? (
                    <ReactMarkdown className="text-sm prose prose-sm max-w-none">
                      {msg.content}
                    </ReactMarkdown>
                  ) : (
                    <>
                      <p className="text-sm">{msg.content}</p>
                      {msg.file_urls && msg.file_urls.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {msg.file_urls.map((url, i) => (
                            <Badge key={i} variant="secondary" className="gap-1">
                              <File className="w-3 h-3" />
                              File {i + 1}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                  
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-200 space-y-1">
                      <p className="text-xs text-slate-500 font-medium">Sources:</p>
                      {msg.sources.map((src, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-xs">
                          <FileText className="w-3 h-3" />
                          <span className={src.type === 'external' ? 'text-blue-600' : 'text-slate-600'}>
                            {src.title}
                            {src.type === 'external' && <Badge variant="outline" className="ml-1 text-[10px] py-0">External</Badge>}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {msg.suggestions && msg.suggestions.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-200">
                      <p className="text-xs text-slate-500 font-medium mb-2 flex items-center gap-1">
                        <Lightbulb className="w-3 h-3" />
                        Related questions:
                      </p>
                      <div className="space-y-1">
                        {msg.suggestions.slice(0, 3).map((sug, i) => (
                          <button
                            key={i}
                            onClick={() => setInput(sug)}
                            className="block w-full text-left text-xs text-slate-600 hover:text-violet-600 transition-colors"
                          >
                            • {sug}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                {msg.role === "user" && (
                  <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center flex-shrink-0">
                    <UserIcon className="w-4 h-4 text-slate-600" />
                  </div>
                )}
              </div>
            ))
          )}
          {isProcessing && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
                <Bot className="w-4 h-4 text-violet-600" />
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3">
                <Loader2 className="w-4 h-4 animate-spin text-violet-600" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-slate-200 bg-white">
          {uploadedFiles.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {uploadedFiles.map((file, idx) => (
                <Badge key={idx} variant="secondary" className="gap-2 pr-1">
                  {file.type?.startsWith('image/') ? <ImageIcon className="w-3 h-3" /> : <File className="w-3 h-3" />}
                  {file.name}
                  <button onClick={() => removeFile(idx)} className="hover:bg-slate-200 rounded p-0.5">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
          
          <div className="flex gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              multiple
              className="hidden"
              accept="image/*,.pdf,.txt,.doc,.docx"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
            >
              <Upload className="w-4 h-4" />
            </Button>
            <Input
              placeholder="Ask a question or upload files..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              disabled={isProcessing}
              className="flex-1"
            />
            <Button
              onClick={handleSend}
              disabled={(!input.trim() && uploadedFiles.length === 0) || isProcessing}
              className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Suggestions Panel */}
      <div className="lg:col-span-2 h-[600px]">
        <SuggestionsPanel 
          conversationContext={messages}
          onDocumentClick={handleDocumentClick}
          onQuestionClick={handleQuestionClick}
        />
      </div>
    </div>
  );
}