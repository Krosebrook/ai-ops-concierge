import { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Send, Loader2, Bot, User as UserIcon, FileText, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

export default function AIAssistant() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isProcessing) return;

    const userMessage = { role: "user", content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsProcessing(true);

    try {
      // Fetch knowledge base
      const [documents, qas] = await Promise.all([
        base44.entities.Document.filter({ status: "active" }),
        base44.entities.CuratedQA.filter({ status: "approved" })
      ]);

      // Build context
      const context = [
        "KNOWLEDGE BASE:",
        ...documents.map(d => 
          `Document: ${d.title}\n${d.ai_summary || d.content?.substring(0, 400)}\nTags: ${d.tags?.join(", ")}`
        ),
        ...qas.map(qa =>
          `Q&A: ${qa.question}\nA: ${qa.answer}`
        )
      ].join("\n\n---\n\n");

      const prompt = `You are a helpful AI assistant with access to a knowledge base. Answer the user's question based on the available information. Be concise and cite sources when possible.

${context}

USER QUESTION: ${input}

Provide a clear, helpful answer. If the knowledge base doesn't contain relevant information, say so and offer general guidance.`;

      const response = await base44.integrations.Core.InvokeLLM({ prompt });

      const aiMessage = {
        role: "assistant",
        content: response.output || "I'm not sure how to answer that.",
        sources: documents.slice(0, 3).map(d => ({ id: d.id, title: d.title }))
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error("AI error:", error);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
        error: true
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="flex flex-col h-[600px] bg-gradient-to-br from-slate-50 to-white border-violet-200">
      {/* Header */}
      <div className="px-4 py-3 border-b border-violet-200 bg-gradient-to-r from-violet-50 to-purple-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800">Knowledge Base Assistant</h3>
            <p className="text-xs text-slate-600">Ask me anything about your documents</p>
          </div>
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
            <p className="text-xs text-slate-500">Ask questions about your knowledge base</p>
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
                  <p className="text-sm">{msg.content}</p>
                )}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-200 space-y-1">
                    <p className="text-xs text-slate-500 font-medium">Sources:</p>
                    {msg.sources.map((src, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-xs text-slate-600">
                        <FileText className="w-3 h-3" />
                        <span>{src.title}</span>
                      </div>
                    ))}
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
        <div className="flex gap-2">
          <Input
            placeholder="Ask a question..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            disabled={isProcessing}
            className="flex-1"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isProcessing}
            className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}