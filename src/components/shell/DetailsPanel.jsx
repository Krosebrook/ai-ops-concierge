import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { X, Clock, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export default function DetailsPanel({ 
  open, 
  onClose, 
  title, 
  subtitle,
  metadata,
  tabs,
  actions 
}) {
  if (!open) return null;

  return (
    <div className={cn(
      "fixed top-0 right-0 h-full w-96 bg-white border-l border-gray-200 shadow-xl z-40 transform transition-transform duration-200",
      open ? "translate-x-0" : "translate-x-full"
    )}>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold text-gray-900 truncate">
                {title}
              </h2>
              {subtitle && (
                <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 -mr-2"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Metadata */}
          {metadata && (
            <div className="space-y-2 text-sm">
              {metadata.created_date && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Created {format(new Date(metadata.created_date), 'MMM d, yyyy')}</span>
                </div>
              )}
              {metadata.created_by && (
                <div className="flex items-center gap-2 text-gray-600">
                  <User className="w-3.5 h-3.5" />
                  <span>{metadata.created_by}</span>
                </div>
              )}
              {metadata.badges && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {metadata.badges.map((badge, idx) => (
                    <Badge key={idx} variant={badge.variant || "secondary"}>
                      {badge.label}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          {actions && (
            <div className="flex gap-2 mt-4">
              {actions}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex-1 overflow-hidden">
          {tabs ? (
            <Tabs defaultValue={tabs[0]?.id} className="h-full flex flex-col">
              <TabsList className="w-full justify-start rounded-none border-b border-gray-200 bg-transparent px-6">
                {tabs.map(tab => (
                  <TabsTrigger key={tab.id} value={tab.id}>
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              {tabs.map(tab => (
                <TabsContent 
                  key={tab.id} 
                  value={tab.id} 
                  className="flex-1 overflow-y-auto p-6 mt-0"
                >
                  {tab.content}
                </TabsContent>
              ))}
            </Tabs>
          ) : (
            <div className="h-full overflow-y-auto p-6">
              {/* Default content slot */}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}