import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  MessageSquare, 
  User, 
  CheckCircle2, 
  AlertCircle,
  Edit,
  Trash2,
  Plus
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const EVENT_CONFIG = {
  create: { icon: Plus, color: "text-green-600", bg: "bg-green-50" },
  update: { icon: Edit, color: "text-blue-600", bg: "bg-blue-50" },
  delete: { icon: Trash2, color: "text-red-600", bg: "bg-red-50" },
  query: { icon: MessageSquare, color: "text-purple-600", bg: "bg-purple-50" },
  view: { icon: FileText, color: "text-gray-600", bg: "bg-gray-50" },
  complete: { icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50" },
  escalate: { icon: AlertCircle, color: "text-orange-600", bg: "bg-orange-50" },
};

export default function ActivityTimeline({ events, loading }) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 animate-pulse rounded w-3/4" />
              <div className="h-3 bg-gray-200 animate-pulse rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!events || events.length === 0) {
    return (
      <div className="py-12 text-center text-gray-500">
        <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-400" />
        <p className="text-sm">No activity yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {events.map((event, idx) => {
        const config = EVENT_CONFIG[event.type] || EVENT_CONFIG.view;
        const Icon = config.icon;

        return (
          <div key={event.id || idx} className="flex gap-3 relative">
            {/* Timeline line */}
            {idx < events.length - 1 && (
              <div className="absolute left-4 top-10 w-px h-full bg-gray-200" />
            )}

            {/* Icon */}
            <div className={cn(
              "relative z-10 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
              config.bg
            )}>
              <Icon className={cn("w-4 h-4", config.color)} />
            </div>

            {/* Content */}
            <div className="flex-1 pt-1">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {event.title}
                  </p>
                  {event.description && (
                    <p className="text-sm text-gray-600 mt-1">
                      {event.description}
                    </p>
                  )}
                  {event.metadata && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {event.metadata.map((item, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {item}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <time className="text-xs text-gray-500 whitespace-nowrap">
                  {format(new Date(event.created_date || event.timestamp), 'MMM d, h:mm a')}
                </time>
              </div>
              {event.user && (
                <div className="flex items-center gap-1 text-xs text-gray-500 mt-2">
                  <User className="w-3 h-3" />
                  {event.user}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}