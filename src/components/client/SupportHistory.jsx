import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  MessageSquare,
  ChevronRight 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const statusConfig = {
  open: { 
    icon: AlertCircle, 
    label: "Open", 
    color: "bg-blue-100 text-blue-800 border-blue-200" 
  },
  in_progress: { 
    icon: Clock, 
    label: "In Progress", 
    color: "bg-amber-100 text-amber-800 border-amber-200" 
  },
  waiting_customer: { 
    icon: MessageSquare, 
    label: "Waiting for You", 
    color: "bg-violet-100 text-violet-800 border-violet-200" 
  },
  resolved: { 
    icon: CheckCircle, 
    label: "Resolved", 
    color: "bg-emerald-100 text-emerald-800 border-emerald-200" 
  },
  closed: { 
    icon: CheckCircle, 
    label: "Closed", 
    color: "bg-slate-100 text-slate-600 border-slate-200" 
  }
};

const priorityColors = {
  low: "text-slate-500",
  medium: "text-blue-600",
  high: "text-orange-600",
  critical: "text-red-600"
};

export default function SupportHistory() {
  const [user, setUser] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <Card className="p-12 text-center">
        <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-slate-700">No support requests yet</h3>
        <p className="text-sm text-slate-500 mt-2">
          When you submit a support request, you'll see it here.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {requests.map((request) => {
        const status = statusConfig[request.status] || statusConfig.open;
        const StatusIcon = status.icon;
        
        return (
          <Card
            key={request.id}
            className="p-5 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => setSelectedRequest(selectedRequest === request.id ? null : request.id)}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <Badge className={cn("gap-1 border", status.color)}>
                    <StatusIcon className="w-3 h-3" />
                    {status.label}
                  </Badge>
                  <span className={cn(
                    "text-xs font-medium uppercase",
                    priorityColors[request.priority]
                  )}>
                    {request.priority}
                  </span>
                </div>
                
                <h3 className="font-semibold text-slate-800 mb-1">
                  {request.subject}
                </h3>
                
                <p className="text-sm text-slate-600 line-clamp-2">
                  {request.description}
                </p>
                
                <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                  <span>Category: {request.category?.replace("_", " ")}</span>
                  <span>•</span>
                  <span>{format(new Date(request.created_date), "MMM d, yyyy")}</span>
                  {request.ai_assisted && (
                    <>
                      <span>•</span>
                      <span className="text-violet-600">✨ AI-assisted</span>
                    </>
                  )}
                </div>
              </div>
              
              <ChevronRight className={cn(
                "w-5 h-5 text-slate-400 transition-transform",
                selectedRequest === request.id && "rotate-90"
              )} />
            </div>

            {selectedRequest === request.id && request.expected_outcome && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-xs font-medium text-slate-600 mb-1">Expected Outcome:</p>
                <p className="text-sm text-slate-700">{request.expected_outcome}</p>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}