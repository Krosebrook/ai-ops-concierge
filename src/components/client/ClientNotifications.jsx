import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Bell,
  CheckCircle,
  AlertCircle,
  Megaphone,
  MessageSquare,
  X,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

const NOTIFICATION_ICONS = {
  support_update: AlertCircle,
  ticket_resolved: CheckCircle,
  new_announcement: Megaphone,
  feedback_response: MessageSquare
};

const NOTIFICATION_COLORS = {
  support_update: "bg-blue-50 border-blue-200 text-blue-800",
  ticket_resolved: "bg-emerald-50 border-emerald-200 text-emerald-800",
  new_announcement: "bg-purple-50 border-purple-200 text-purple-800",
  feedback_response: "bg-indigo-50 border-indigo-200 text-indigo-800"
};

/**
 * Client portal notifications component
 */
export default function ClientNotifications({ userEmail, compact = false }) {
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications", userEmail],
    queryFn: () => base44.entities.Notification.filter({ 
      recipient_email: userEmail,
    }),
    enabled: !!userEmail
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markAsReadMutation = useMutation({
    mutationFn: (notificationId) => 
      base44.entities.Notification.update(notificationId, { is_read: true }),
    onSuccess: () => {
      queryClient.invalidateQueries(["notifications"]);
    }
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: (notificationId) => 
      base44.entities.Notification.delete(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries(["notifications"]);
    }
  });

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg">
          <Bell className="w-4 h-4 text-slate-600" />
          <span className="text-sm font-medium text-slate-700">
            {unreadCount} new {unreadCount === 1 ? "notification" : "notifications"}
          </span>
        </div>
        {notifications.slice(0, 3).map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onMarkRead={() => markAsReadMutation.mutate(notification.id)}
            onDelete={() => deleteNotificationMutation.mutate(notification.id)}
            compact
          />
        ))}
        {notifications.length > 3 && (
          <p className="text-xs text-slate-500 text-center py-2">
            +{notifications.length - 3} more notifications
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-slate-600" />
          <h3 className="text-lg font-semibold text-slate-900">Notifications</h3>
          {unreadCount > 0 && (
            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
              {unreadCount} new
            </span>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
        </div>
      ) : notifications.length === 0 ? (
        <Card className="p-8 text-center bg-white border-0 shadow-sm">
          <Bell className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-600">No notifications yet</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onMarkRead={() => markAsReadMutation.mutate(notification.id)}
              onDelete={() => deleteNotificationMutation.mutate(notification.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function NotificationItem({ notification, onMarkRead, onDelete, compact = false }) {
  const Icon = NOTIFICATION_ICONS[notification.type];
  const colorClass = NOTIFICATION_COLORS[notification.type];

  return (
    <Card className={cn(
      "border transition-all",
      colorClass,
      !notification.is_read && "border-current ring-1 ring-current/20"
    )}>
      <div className="p-3 flex items-start gap-3">
        {Icon && <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />}
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm line-clamp-1">
            {notification.title}
          </h4>
          <p className="text-xs mt-1 opacity-90 line-clamp-2">
            {notification.message}
          </p>
          <p className="text-xs mt-2 opacity-75">
            {formatDistanceToNow(new Date(notification.created_date), { addSuffix: true })}
          </p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {!notification.is_read && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onMarkRead}
              className="h-6 w-6 text-current/70 hover:text-current"
              title="Mark as read"
            >
              <CheckCircle className="w-4 h-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            className="h-6 w-6 text-current/70 hover:text-current"
            title="Delete"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}