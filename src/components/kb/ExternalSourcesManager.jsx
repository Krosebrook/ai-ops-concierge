import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globe, RefreshCw, Plus, Loader2, CheckCircle, XCircle, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function ExternalSourcesManager() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newSource, setNewSource] = useState({
    name: "",
    type: "documentation",
    url: "",
    sync_frequency: "manual",
    external_only: true,
    auto_tag: ""
  });
  const queryClient = useQueryClient();

  const { data: sources = [], isLoading } = useQuery({
    queryKey: ["externalSources"],
    queryFn: () => base44.entities.ExternalSource.list("-created_date")
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ExternalSource.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["externalSources"] });
      toast.success("External source added");
      setShowAddDialog(false);
      setNewSource({ name: "", type: "documentation", url: "", sync_frequency: "manual", external_only: true, auto_tag: "" });
    }
  });

  const syncMutation = useMutation({
    mutationFn: async (sourceId) => {
      const response = await base44.functions.invoke('syncExternalSource', { sourceId });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["externalSources"] });
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast.success(`Synced: ${data.source}`);
    },
    onError: () => {
      toast.error("Sync failed");
    }
  });

  const statusColors = {
    active: { bg: "bg-green-100", text: "text-green-800", icon: CheckCircle },
    inactive: { bg: "bg-slate-100", text: "text-slate-600", icon: XCircle },
    error: { bg: "bg-red-100", text: "text-red-800", icon: XCircle }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-600" />
            External Knowledge Sources
          </h3>
          <p className="text-sm text-slate-600 mt-1">
            Sync content from external documentation, articles, and public resources
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Source
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      ) : sources.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Globe className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600">No external sources configured yet.</p>
            <p className="text-sm text-slate-500 mt-1">Add sources to expand your knowledge base.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sources.map((source) => {
            const StatusIcon = statusColors[source.status]?.icon || CheckCircle;
            
            return (
              <Card key={source.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-slate-900">{source.name}</h4>
                        <Badge className={statusColors[source.status]?.bg + " " + statusColors[source.status]?.text}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {source.status}
                        </Badge>
                        <Badge variant="outline" className="text-xs capitalize">
                          {source.type}
                        </Badge>
                        {source.external_only && (
                          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                            External Only
                          </Badge>
                        )}
                      </div>
                      
                      <a 
                        href={source.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline flex items-center gap-1 mb-2"
                      >
                        {source.url}
                        <ExternalLink className="w-3 h-3" />
                      </a>

                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span>Sync: {source.sync_frequency}</span>
                        {source.last_synced_at && (
                          <span>Last: {format(new Date(source.last_synced_at), 'MMM d, HH:mm')}</span>
                        )}
                        <span>{source.document_count || 0} documents</span>
                        {source.auto_tag && (
                          <Badge variant="secondary" className="text-xs">
                            Tag: {source.auto_tag}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => syncMutation.mutate(source.id)}
                      disabled={syncMutation.isPending}
                      className="gap-2"
                    >
                      <RefreshCw className={`w-4 h-4 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
                      Sync Now
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Source Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add External Source</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Source Name</Label>
              <Input
                value={newSource.name}
                onChange={(e) => setNewSource({ ...newSource, name: e.target.value })}
                placeholder="e.g., Product Documentation"
              />
            </div>
            <div>
              <Label>Type</Label>
              <Select 
                value={newSource.type} 
                onValueChange={(v) => setNewSource({ ...newSource, type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="documentation">Documentation</SelectItem>
                  <SelectItem value="article">Article</SelectItem>
                  <SelectItem value="public_resource">Public Resource</SelectItem>
                  <SelectItem value="api">API</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>URL</Label>
              <Input
                value={newSource.url}
                onChange={(e) => setNewSource({ ...newSource, url: e.target.value })}
                placeholder="https://docs.example.com"
              />
            </div>
            <div>
              <Label>Auto-Tag (optional)</Label>
              <Input
                value={newSource.auto_tag}
                onChange={(e) => setNewSource({ ...newSource, auto_tag: e.target.value })}
                placeholder="e.g., Support"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="external_only"
                checked={newSource.external_only}
                onChange={(e) => setNewSource({ ...newSource, external_only: e.target.checked })}
              />
              <Label htmlFor="external_only" className="cursor-pointer">
                External/Client portal only (prevent internal leakage)
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => createMutation.mutate(newSource)}
              disabled={!newSource.name || !newSource.url}
            >
              Add Source
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}