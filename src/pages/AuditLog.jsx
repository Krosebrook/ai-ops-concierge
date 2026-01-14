import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ClipboardList,
  Search,
  MessageSquare,
  FileEdit,
  Calendar,
  User,
  ChevronRight,
  Filter,
  Eye,
  Loader2,
  AlertTriangle,
  FileText
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import ConfidenceBadge from "@/components/ui/ConfidenceBadge";
import PolicyFlag from "@/components/ui/PolicyFlag";
import CitationCard from "@/components/ui/CitationCard";
import ReactMarkdown from "react-markdown";

export default function AuditLog() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState("all");
  const [filterConfidence, setFilterConfidence] = useState("all");
  const [selectedEvent, setSelectedEvent] = useState(null);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["aiEvents"],
    queryFn: () => base44.entities.AIEvent.list("-created_date", 100),
  });

  const filteredEvents = events.filter((event) => {
    const matchesSearch = !searchQuery || 
      event.input?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.output?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.user_email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMode = filterMode === "all" || event.mode === filterMode;
    const matchesConfidence = filterConfidence === "all" || event.confidence === filterConfidence;
    return matchesSearch && matchesMode && matchesConfidence;
  });

  const modeIcons = {
    ask: MessageSquare,
    draft: FileEdit
  };

  const modeColors = {
    ask: "bg-indigo-100 text-indigo-700",
    draft: "bg-violet-100 text-violet-700"
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
      {/* Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 text-amber-600 text-sm font-medium mb-4">
          <ClipboardList className="w-4 h-4" />
          <span>Audit Log</span>
        </div>
        <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight">
          Audit Log
        </h1>
        <p className="mt-2 text-slate-600">
          Review all AI interactions with full evidence trails.
        </p>
      </div>

      {/* Filters */}
      <Card className="bg-white border-0 shadow-sm mb-6">
        <div className="p-4 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search by prompt, output, or user..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-3">
            <Select value={filterMode} onValueChange={setFilterMode}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modes</SelectItem>
                <SelectItem value="ask">Ask</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterConfidence} onValueChange={setFilterConfidence}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Confidence" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Events Table */}
      <Card className="bg-white border-0 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-16">
            <ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-700">No events found</h3>
            <p className="text-sm text-slate-500 mt-1">
              AI interactions will appear here as they happen.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50">
                <TableHead className="w-[100px]">Mode</TableHead>
                <TableHead>Input</TableHead>
                <TableHead className="w-[140px]">User</TableHead>
                <TableHead className="w-[100px]">Confidence</TableHead>
                <TableHead className="w-[80px]">Flags</TableHead>
                <TableHead className="w-[140px]">Time</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEvents.map((event) => {
                const ModeIcon = modeIcons[event.mode] || MessageSquare;
                return (
                  <TableRow 
                    key={event.id} 
                    className="cursor-pointer hover:bg-slate-50/50"
                    onClick={() => setSelectedEvent(event)}
                  >
                    <TableCell>
                      <Badge className={cn("gap-1", modeColors[event.mode])}>
                        <ModeIcon className="w-3 h-3" />
                        {event.mode}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-slate-700 line-clamp-1 max-w-md">
                        {event.input}
                      </p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center">
                          <User className="w-3 h-3 text-slate-500" />
                        </div>
                        <span className="text-sm text-slate-600 truncate max-w-[100px]">
                          {event.user_email?.split("@")[0] || "Unknown"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {event.confidence && (
                        <ConfidenceBadge level={event.confidence} showLabel={false} />
                      )}
                    </TableCell>
                    <TableCell>
                      {event.flags?.length > 0 && (
                        <div className="flex items-center gap-1">
                          <AlertTriangle className="w-4 h-4 text-amber-500" />
                          <span className="text-xs text-slate-500">{event.flags.length}</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-slate-500">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(event.created_date), "MMM d, HH:mm")}
                      </div>
                    </TableCell>
                    <TableCell>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Event Detail Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Badge className={cn("gap-1", modeColors[selectedEvent?.mode])}>
                {selectedEvent?.mode === "ask" ? (
                  <MessageSquare className="w-3 h-3" />
                ) : (
                  <FileEdit className="w-3 h-3" />
                )}
                {selectedEvent?.mode} event
              </Badge>
              <span className="text-sm text-slate-500 font-normal">
                {selectedEvent && format(new Date(selectedEvent.created_date), "MMM d, yyyy 'at' HH:mm:ss")}
              </span>
            </DialogTitle>
          </DialogHeader>

          {selectedEvent && (
            <div className="space-y-6 py-4">
              {/* Meta info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl">
                <div>
                  <p className="text-xs text-slate-500 mb-1">User</p>
                  <p className="text-sm font-medium text-slate-700">
                    {selectedEvent.user_email}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Role</p>
                  <p className="text-sm font-medium text-slate-700 capitalize">
                    {selectedEvent.user_role || "Unknown"}
                  </p>
                </div>
                {selectedEvent.draft_type && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Draft Type</p>
                    <p className="text-sm font-medium text-slate-700 capitalize">
                      {selectedEvent.draft_type.replace("_", " ")}
                    </p>
                  </div>
                )}
                {selectedEvent.confidence && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Confidence</p>
                    <ConfidenceBadge level={selectedEvent.confidence} />
                  </div>
                )}
              </div>

              {/* Flags */}
              {selectedEvent.flags?.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-slate-700">Policy Flags</h4>
                  {selectedEvent.flags.map((flag) => (
                    <PolicyFlag key={flag} type={flag} />
                  ))}
                </div>
              )}

              {/* Input */}
              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-2">Input</h4>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">
                    {selectedEvent.input}
                  </p>
                </div>
              </div>

              {/* Context */}
              {selectedEvent.context_json && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 mb-2">Context</h4>
                  <div className="p-4 bg-slate-50 rounded-xl">
                    <pre className="text-xs text-slate-600 overflow-x-auto">
                      {JSON.stringify(JSON.parse(selectedEvent.context_json || "{}"), null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {/* Output */}
              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-2">Output</h4>
                <div className="p-4 bg-white border border-slate-200 rounded-xl">
                  <div className="prose prose-sm prose-slate max-w-none">
                    <ReactMarkdown>{selectedEvent.output || "No output recorded"}</ReactMarkdown>
                  </div>
                </div>
              </div>

              {/* Sources */}
              {selectedEvent.sources?.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 mb-2">
                    Sources ({selectedEvent.sources.length})
                  </h4>
                  <div className="grid grid-cols-1 gap-2">
                    {selectedEvent.sources.map((source, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                        <FileText className="w-4 h-4 text-slate-400" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-700">
                            {source.document_title}
                          </p>
                          {source.section && (
                            <p className="text-xs text-slate-500">{source.section}</p>
                          )}
                        </div>
                        {source.score && (
                          <span className="text-xs text-slate-500">
                            {Math.round(source.score * 100)}%
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Escalation */}
              {selectedEvent.escalation_target && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-semibold text-amber-900">
                        Escalation Recommended
                      </h4>
                      <p className="text-sm text-amber-800 mt-1">
                        <strong>Target:</strong> {selectedEvent.escalation_target}
                      </p>
                      {selectedEvent.escalation_reason && (
                        <p className="text-sm text-amber-700 mt-1">
                          {selectedEvent.escalation_reason}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Event ID */}
              <div className="pt-4 border-t border-slate-100">
                <p className="text-xs text-slate-400">
                  Event ID: {selectedEvent.id}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}