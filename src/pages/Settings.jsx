import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Settings as SettingsIcon,
  Users,
  Shield,
  FileText,
  Globe,
  Lock,
  Check,
  X,
  Crown,
  User,
  Mail,
  Loader2,
  Plus,
  Trash2,
  Edit2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";

export default function Settings() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("general");

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: documents = [] } = useQuery({
    queryKey: ["documents", "active"],
    queryFn: () => base44.entities.Document.filter({ status: "active" }),
  });

  const { data: customRoles = [] } = useQuery({
    queryKey: ["customRoles"],
    queryFn: () => base44.entities.CustomRole.list(),
  });

  const isAdmin = user?.role === "admin";
  const queryClient = useQueryClient();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
      {/* Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 text-sm font-medium mb-4">
          <SettingsIcon className="w-4 h-4" />
          <span>Settings</span>
        </div>
        <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight">
          Settings
        </h1>
        <p className="mt-2 text-slate-600">
          Manage roles, permissions, and data sources.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-100 p-1 mb-8">
          <TabsTrigger value="general" className="gap-2">
            <SettingsIcon className="w-4 h-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2">
            <Users className="w-4 h-4" />
            Users & Roles
          </TabsTrigger>
          <TabsTrigger value="roles" className="gap-2">
            <Shield className="w-4 h-4" />
            Custom Roles
          </TabsTrigger>
          <TabsTrigger value="sources" className="gap-2">
            <FileText className="w-4 h-4" />
            Data Sources
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-slate-500" />
                General Settings
              </CardTitle>
              <CardDescription>
                Configure general application settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Require citations</Label>
                  <p className="text-sm text-slate-500 mt-0.5">
                    AI must cite sources or indicate insufficient evidence
                  </p>
                </div>
                <Switch defaultChecked disabled />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Auto-detect PII</Label>
                  <p className="text-sm text-slate-500 mt-0.5">
                    Automatically flag potential personal information
                  </p>
                </div>
                <Switch defaultChecked disabled />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Secret scanning</Label>
                  <p className="text-sm text-slate-500 mt-0.5">
                    Detect API keys and credentials in outputs
                  </p>
                </div>
                <Switch defaultChecked disabled />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-slate-500" />
                Confidence Thresholds
              </CardTitle>
              <CardDescription>
                Configure when escalation is recommended
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                  <p className="text-sm font-medium text-emerald-800">High</p>
                  <p className="text-2xl font-bold text-emerald-600 mt-1">≥ 80%</p>
                  <p className="text-xs text-emerald-600 mt-2">No action needed</p>
                </div>
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                  <p className="text-sm font-medium text-amber-800">Medium</p>
                  <p className="text-2xl font-bold text-amber-600 mt-1">50-79%</p>
                  <p className="text-xs text-amber-600 mt-2">Review suggested</p>
                </div>
                <div className="p-4 bg-rose-50 rounded-xl border border-rose-100">
                  <p className="text-sm font-medium text-rose-800">Low</p>
                  <p className="text-2xl font-bold text-rose-600 mt-1">{"< 50%"}</p>
                  <p className="text-xs text-rose-600 mt-2">Escalation recommended</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users & Roles */}
        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-slate-500" />
                Team Members
              </CardTitle>
              <CardDescription>
                Manage user access and roles
              </CardDescription>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-9 h-9 rounded-full flex items-center justify-center",
                              u.role === "admin" 
                                ? "bg-gradient-to-br from-amber-400 to-orange-500" 
                                : "bg-gradient-to-br from-indigo-500 to-violet-600"
                            )}>
                              {u.role === "admin" ? (
                                <Crown className="w-4 h-4 text-white" />
                              ) : (
                                <User className="w-4 h-4 text-white" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-slate-800">
                                {u.full_name || "Unnamed"}
                              </p>
                              <p className="text-sm text-slate-500">{u.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn(
                            u.role === "admin"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-slate-100 text-slate-700"
                          )}>
                            {u.role || "user"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-slate-500">
                          {u.created_date ? format(new Date(u.created_date), "MMM d, yyyy") : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-emerald-600">
                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span className="text-sm">Active</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-slate-500" />
                Role Permissions
              </CardTitle>
              <CardDescription>
                Overview of role-based access control
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Permission</TableHead>
                    <TableHead className="text-center">Agent</TableHead>
                    <TableHead className="text-center">Manager</TableHead>
                    <TableHead className="text-center">Admin</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    { name: "Ask Mode", agent: true, manager: true, admin: true },
                    { name: "Draft Mode", agent: true, manager: true, admin: true },
                    { name: "View Knowledge Base", agent: true, manager: true, admin: true },
                    { name: "Upload Documents", agent: false, manager: true, admin: true },
                    { name: "Create Q&A", agent: true, manager: true, admin: true },
                    { name: "Approve Q&A", agent: false, manager: true, admin: true },
                    { name: "View Audit Log", agent: false, manager: true, admin: true },
                    { name: "Manage Users", agent: false, manager: false, admin: true },
                    { name: "Manage Settings", agent: false, manager: false, admin: true },
                  ].map((perm) => (
                    <TableRow key={perm.name}>
                      <TableCell className="font-medium text-slate-700">{perm.name}</TableCell>
                      <TableCell className="text-center">
                        {perm.agent ? (
                          <Check className="w-4 h-4 text-emerald-500 mx-auto" />
                        ) : (
                          <X className="w-4 h-4 text-slate-300 mx-auto" />
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {perm.manager ? (
                          <Check className="w-4 h-4 text-emerald-500 mx-auto" />
                        ) : (
                          <X className="w-4 h-4 text-slate-300 mx-auto" />
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {perm.admin ? (
                          <Check className="w-4 h-4 text-emerald-500 mx-auto" />
                        ) : (
                          <X className="w-4 h-4 text-slate-300 mx-auto" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data Sources */}
        <TabsContent value="sources" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-slate-500" />
                Active Documents
              </CardTitle>
              <CardDescription>
                Documents available to the AI assistant
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {documents.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-8">
                    No active documents. Upload documents in the Knowledge Base.
                  </p>
                ) : (
                  documents.map((doc) => (
                    <div 
                      key={doc.id}
                      className="flex items-center justify-between p-4 bg-slate-50 rounded-xl"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center">
                          <FileText className="w-5 h-5 text-slate-400" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">{doc.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-slate-500">
                              v{doc.version || 1}
                            </span>
                            {doc.tags?.map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={cn(
                          "gap-1",
                          doc.external_approved 
                            ? "bg-blue-100 text-blue-800" 
                            : "bg-emerald-100 text-emerald-800"
                        )}>
                          <Globe className="w-3 h-3" />
                          {doc.external_approved ? "Public" : "Internal"}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-slate-500" />
                External Client Access
              </CardTitle>
              <CardDescription>
                Configure which sources are available to external clients
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-6 border border-slate-200 rounded-xl bg-slate-50/50">
                <div className="flex items-start gap-3 mb-4">
                  <Lock className="w-5 h-5 text-slate-500 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-slate-800">Client Portal Access</h4>
                    <p className="text-sm text-slate-600 mt-1">
                      Documents and Q&As marked as "external approved" will be visible in the client portal.
                      Clients can only see approved content - internal data is never exposed.
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                    <span className="text-sm text-slate-700">External-approved documents</span>
                    <Badge variant="secondary">
                      {documents.filter(d => d.external_approved).length} of {documents.length}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                    <span className="text-sm text-slate-700">Client portal page</span>
                    <Badge className="bg-blue-100 text-blue-800">ClientPortal</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}