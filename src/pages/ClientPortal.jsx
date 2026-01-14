import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { HelpCircle, MessageSquare, Sparkles, Shield, LayoutDashboard, BookOpen, Clock, Bot, Bell } from "lucide-react";
import ClientAsk from "@/components/client/ClientAsk";
import SupportRequestForm from "@/components/client/SupportRequestForm";
import FAQ from "@/components/client/FAQ";
import SupportHistory from "@/components/client/SupportHistory";
import AccountDashboard from "@/components/client/AccountDashboard";
import Chatbot from "@/components/client/Chatbot";
import ClientNotifications from "@/components/client/ClientNotifications";

export default function ClientPortal() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 text-blue-600 text-sm font-medium mb-4">
            <Shield className="w-4 h-4" />
            <span>Client Portal</span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight">
            Welcome, {user?.full_name || "Customer"}
          </h1>
          <p className="mt-3 text-slate-600">
            Get help quickly with our AI-powered support assistant and knowledge base.
          </p>
        </div>

        {/* Trust Indicators */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Card className="p-4 bg-white border-0 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">AI-Powered</p>
                <p className="text-xs text-slate-500">Instant answers</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-white border-0 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Shield className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">Secure</p>
                <p className="text-xs text-slate-500">Your data is private</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-white border-0 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center">
                <HelpCircle className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">24/7 Help</p>
                <p className="text-xs text-slate-500">Always available</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="notifications" className="space-y-6">
          <TabsList className="grid w-full grid-cols-7 bg-slate-100 p-1">
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="w-4 h-4" />
              <span className="hidden sm:inline">Notifications</span>
            </TabsTrigger>
            <TabsTrigger value="chat" className="gap-2">
              <Bot className="w-4 h-4" />
              <span className="hidden sm:inline">Chat</span>
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="gap-2">
              <LayoutDashboard className="w-4 h-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="faq" className="gap-2">
              <BookOpen className="w-4 h-4" />
              <span className="hidden sm:inline">FAQ</span>
            </TabsTrigger>
            <TabsTrigger value="support" className="gap-2">
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">Submit</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <Clock className="w-4 h-4" />
              <span className="hidden sm:inline">History</span>
            </TabsTrigger>
            <TabsTrigger value="ask" className="gap-2">
              <HelpCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Ask</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="notifications">
            <ClientNotifications userEmail={user?.email} />
          </TabsContent>

          <TabsContent value="chat">
            <Card className="overflow-hidden shadow-lg border-0">
              <Chatbot />
            </Card>
          </TabsContent>

          <TabsContent value="dashboard">
            <AccountDashboard />
          </TabsContent>

          <TabsContent value="ask">
            <ClientAsk />
          </TabsContent>

          <TabsContent value="faq">
            <FAQ />
          </TabsContent>

          <TabsContent value="support">
            <div className="space-y-4">
              <Card className="bg-blue-50 border-blue-200 p-4">
                <p className="text-sm text-blue-800">
                  <strong>💡 Tip:</strong> Use "Improve with AI" to make your request clearer and get faster help from our support team.
                </p>
              </Card>
              <SupportRequestForm />
            </div>
          </TabsContent>

          <TabsContent value="history">
            <SupportHistory />
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-slate-200 text-center">
          <p className="text-xs text-slate-500">
            Your requests are handled securely and privately. We never share your data.
          </p>
        </div>
      </div>
    </div>
  );
}