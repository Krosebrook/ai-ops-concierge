import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Search, 
  Filter, 
  Download,
  Calendar
} from "lucide-react";
import TopBar from "@/components/shell/TopBar";
import ActivityTimeline from "@/components/shell/ActivityTimeline";
import DetailsPanel from "@/components/shell/DetailsPanel";

export default function ActivityLog() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activityType, setActivityType] = useState("all");
  const [selectedEvent, setSelectedEvent] = useState(null);

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ["userActivity"],
    queryFn: () => base44.entities.UserActivity.list('-created_date', 100)
  });

  const { data: aiEvents = [] } = useQuery({
    queryKey: ["aiEvents"],
    queryFn: () => base44.entities.AIEvent.list('-created_date', 50)
  });

  // Combine and format activities
  const allEvents = [
    ...activities.map(a => ({
      id: a.id,
      type: a.activity_type,
      title: `${a.activity_type.replace(/_/g, ' ').toUpperCase()}`,
      description: a.activity_context?.query_text || a.activity_context?.document_title,
      created_date: a.created_date,
      user: a.user_email,
      metadata: a.activity_context?.tags || []
    })),
    ...aiEvents.map(e => ({
      id: e.id,
      type: 'query',
      title: e.mode === 'ask' ? 'Asked Question' : 'Created Draft',
      description: e.input?.slice(0, 100),
      created_date: e.created_date,
      user: e.user_email,
      metadata: [e.confidence, ...e.flags || []]
    }))
  ].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

  const filteredEvents = allEvents.filter(event => {
    const matchesType = activityType === "all" || event.type === activityType;
    const matchesSearch = !searchQuery || 
      event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <div className="h-screen flex flex-col">
      <TopBar
        title="Activity Log"
        subtitle="System-wide event history and audit trail"
        actions={
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        }
      />

      <div className="flex-1 overflow-hidden flex">
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Filters */}
            <Card className="p-4">
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search activity..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={activityType} onValueChange={setActivityType}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Activity</SelectItem>
                    <SelectItem value="query">Queries</SelectItem>
                    <SelectItem value="document_view">Document Views</SelectItem>
                    <SelectItem value="kb_search">KB Searches</SelectItem>
                    <SelectItem value="task_complete">Task Completions</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon">
                  <Filter className="w-4 h-4" />
                </Button>
              </div>
            </Card>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: "Total Events", value: allEvents.length, change: "+12%" },
                { label: "Today", value: allEvents.filter(e => {
                  const today = new Date().toDateString();
                  return new Date(e.created_date).toDateString() === today;
                }).length, change: "+5%" },
                { label: "AI Queries", value: aiEvents.length, change: "+18%" },
                { label: "Documents Viewed", value: activities.filter(a => a.activity_type === 'document_view').length, change: "+8%" }
              ].map((stat, idx) => (
                <Card key={idx} className="p-4">
                  <p className="text-sm text-gray-600">{stat.label}</p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
                    <Badge variant="secondary" className="text-xs">
                      {stat.change}
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>

            {/* Timeline */}
            <Card className="p-6">
              <ActivityTimeline 
                events={filteredEvents} 
                loading={isLoading}
              />
            </Card>
          </div>
        </div>

        {/* Details Panel */}
        <DetailsPanel
          open={!!selectedEvent}
          onClose={() => setSelectedEvent(null)}
          title={selectedEvent?.title}
          subtitle={selectedEvent?.description}
          metadata={selectedEvent}
          tabs={[
            {
              id: "details",
              label: "Details",
              content: selectedEvent && (
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase mb-1">Event ID</p>
                    <p className="text-sm text-gray-900 font-mono">{selectedEvent.id}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase mb-1">Type</p>
                    <Badge>{selectedEvent.type}</Badge>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase mb-1">User</p>
                    <p className="text-sm text-gray-900">{selectedEvent.user}</p>
                  </div>
                  {selectedEvent.metadata && selectedEvent.metadata.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase mb-2">Metadata</p>
                      <div className="flex flex-wrap gap-1">
                        {selectedEvent.metadata.map((item, i) => (
                          <Badge key={i} variant="secondary">{item}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            }
          ]}
        />
      </div>
    </div>
  );
}