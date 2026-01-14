import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  User, 
  Mail, 
  Calendar,
  MessageSquare,
  CheckCircle,
  Clock,
  TrendingUp,
  Loader2
} from "lucide-react";
import { format } from "date-fns";

export default function AccountDashboard() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["supportRequests", user?.email],
    queryFn: () => user ? base44.entities.SupportRequest.filter({ 
      customer_email: user.email 
    }) : [],
    enabled: !!user,
  });

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  const openRequests = requests.filter(r => 
    r.status === "open" || r.status === "in_progress" || r.status === "waiting_customer"
  ).length;
  const resolvedRequests = requests.filter(r => 
    r.status === "resolved" || r.status === "closed"
  ).length;

  return (
    <div className="space-y-6">
      {/* Account Info */}
      <Card className="bg-gradient-to-br from-white to-blue-50/30 border-0 shadow-lg">
        <div className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold">
              {user.full_name?.charAt(0) || user.email?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                {user.full_name || "Customer"}
              </h2>
              <p className="text-sm text-slate-600 flex items-center gap-2 mt-1">
                <Mail className="w-4 h-4" />
                {user.email}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-white/50 rounded-lg">
              <div className="flex items-center gap-2 text-slate-600 mb-1">
                <Calendar className="w-4 h-4" />
                <span className="text-xs font-medium">Member Since</span>
              </div>
              <p className="text-sm font-semibold text-slate-800">
                {format(new Date(user.created_date), "MMM yyyy")}
              </p>
            </div>
            <div className="p-3 bg-white/50 rounded-lg">
              <div className="flex items-center gap-2 text-slate-600 mb-1">
                <User className="w-4 h-4" />
                <span className="text-xs font-medium">Account Type</span>
              </div>
              <Badge className="bg-blue-100 text-blue-800">
                {user.role === "admin" ? "Premium" : "Standard"}
              </Badge>
            </div>
          </div>
        </div>
      </Card>

      {/* Support Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5 bg-white border-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{openRequests}</p>
              <p className="text-xs text-slate-500">Active Requests</p>
            </div>
          </div>
        </Card>

        <Card className="p-5 bg-white border-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{resolvedRequests}</p>
              <p className="text-xs text-slate-500">Resolved</p>
            </div>
          </div>
        </Card>

        <Card className="p-5 bg-white border-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{requests.length}</p>
              <p className="text-xs text-slate-500">Total Requests</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Quick Stats */}
      <Card className="bg-gradient-to-br from-violet-50 to-purple-50 border-violet-200 p-5">
        <div className="flex items-start gap-3">
          <TrendingUp className="w-5 h-5 text-violet-600 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-violet-900 mb-1">
              Support Activity
            </h3>
            <p className="text-xs text-violet-700">
              {openRequests > 0 
                ? `You have ${openRequests} active support ${openRequests === 1 ? 'request' : 'requests'}. We're on it!`
                : "All caught up! No active support requests."
              }
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}