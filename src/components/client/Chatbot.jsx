import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Send, Loader2, Bot, User, AlertCircle, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function Chatbot() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hi! I'm your AI support assistant. I can help answer questions about our service. What can I help you with today?",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [user, setUser] = useState(null);
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const { data: externalQAs = [] } = useQuery({
    queryKey: ["externalQAs"],
    queryFn: () => base44.entities.CuratedQA.filter({ 
      status: "approved",
      external_approved: true 
    }),
  });

  const { data: externalDocs = [] } = useQuery({
    queryKey: ["externalDocs"],
    queryFn: () => base44.entities.Document.filter({ 
      status: "active", 
      external_approved: true 
    }),
  });

  const createTicketMutation = useMutation({
    mutationFn: (data) => base44.entities.SupportRequest.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(["supportRequests"]);
    },
  });

  const handleSend = async () => {
    if (!input.trim() || isProcessing) return;

    const userMessage = {
      role: "user",
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsProcessing(true);

    const knowledgeContext = [
      ...externalQAs.slice(0, 10).map(qa => `Q: ${qa.question}\nA: ${qa.answer}`),
      ...externalDocs.slice(0, 5).map(d => `[${d.title}]\n${d.content?.slice(0, 300) || ""}`)
    ].join("\n\n---\n\n");

    const prompt = `You are a helpful customer support chatbot.

APPROVED KNOWLEDGE BASE:
${knowledgeContext || "No approved content available."}

CUSTOMER QUESTION: ${input}

INSTRUCTIONS:
1. Check if you can answer using the knowledge base above
2. If YES: Provide a helpful, friendly answer
3. If NO or if question is about their specific account/billing/technical issue: Recommend creating a support ticket

Respond in JSON format:
{
  "can_answer": true/false,
  "answer": "Your friendly answer" or "I'll help you create a support ticket",
  "needs_escalation": true/false,
  "escalation_reason": "Why this needs human support" (if applicable),
  "suggested_category": "technical" or "billing" or "account" or "other" (if escalation),
  "suggested_priority": "low" or "medium" or "high" (if escalation)
}`;

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            can_answer: { type: "boolean" },
            answer: { type: "string" },
            needs_escalation: { type: "boolean" },
            escalation_reason: { type: "string" },
            suggested_category: { type: "string" },
            suggested_priority: { type: "string" }
          }
        }
      });

      const assistantMessage = {
        role: "assistant",
        content: result.answer,
        timestamp: new Date(),
        needsEscalation: result.needs_escalation,
        escalationData: result.needs_escalation ? {
          reason: result.escalation_reason,
          category: result.suggested_category || "other",
          priority: result.suggested_priority || "medium"
        } : null
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Auto-create ticket if escalation needed
      if (result.needs_escalation && user) {
        try {
          await createTicketMutation.mutateAsync({
            subject: `Chat escalation: ${input.slice(0, 60)}...`,
            description: `Customer question: ${input}\n\nReason for escalation: ${result.escalation_reason}`,
            category: result.suggested_category || "other",
            priority: result.suggested_priority || "medium",
            status: "open",
            customer_email: user.email,
            customer_name: user.full_name,
            ai_assisted: true,
            expected_outcome: "Response to my inquiry"
          });

          const ticketMessage = {
            role: "system",
            content: "✅ Support ticket created successfully! Our team will respond soon.",
            timestamp: new Date()
          };
          setMessages(prev => [...prev, ticketMessage]);
        } catch (error) {
          toast.error("Failed to create support ticket");
        }
      }
    } catch (error) {
      const errorMessage = {
        role: "assistant",
        content: "I'm having trouble right now. Please try again or submit a support request directly.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      toast.error("Failed to process message");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-[600px]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, idx) => (
          <div
            key={idx}
            className={cn(
              "flex gap-3",
              message.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            {message.role === "assistant" && (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
            )}
            {message.role === "system" && (
              <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-4 h-4 text-white" />
              </div>
            )}
            
            <div className={cn(
              "max-w-[80%] rounded-2xl px-4 py-2.5",
              message.role === "user" 
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
                : message.role === "system"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-white border border-slate-200 text-slate-800"
            )}>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {message.content}
              </p>
              {message.needsEscalation && message.escalationData && (
                <div className="mt-3 pt-3 border-t border-slate-200">
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <AlertCircle className="w-3 h-3" />
                    <span>Creating support ticket...</span>
                  </div>
                </div>
              )}
            </div>

            {message.role === "user" && (
              <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-slate-600" />
              </div>
            )}
          </div>
        ))}
        {isProcessing && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl px-4 py-2.5">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                <span className="text-sm text-slate-500">Thinking...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-slate-200 p-4 bg-white">
        <div className="flex gap-2">
          <Input
            placeholder="Ask me anything..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            disabled={isProcessing}
            className="flex-1"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isProcessing}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-xs text-slate-500 mt-2 text-center">
          Complex questions will automatically create a support ticket
        </p>
      </div>
    </div>
  );
}