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
                          <div className="flex flex-col gap-1">
                            <Badge className={cn(
                              u.role === "admin"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-slate-100 text-slate-700"
                            )}>
                              {u.role || "user"}
                            </Badge>
                            {u.custom_role_id && customRoles.find(r => r.id === u.custom_role_id) && (
                              <Badge variant="outline" className="text-xs">
                                {customRoles.find(r => r.id === u.custom_role_id).name}
                              </Badge>
                            )}
                          </div>
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

        {/* Custom Roles */}
        <TabsContent value="roles" className="space-y-6">
          <CustomRolesPanel roles={customRoles} queryClient={queryClient} isAdmin={isAdmin} />
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

const AVAILABLE_PERMISSIONS = [
  { id: "ask_mode", label: "Ask Mode" },
  { id: "draft_mode", label: "Draft Mode" },
  { id: "view_knowledge_base", label: "View Knowledge Base" },
  { id: "upload_documents", label: "Upload Documents" },
  { id: "publish_documents", label: "Publish Documents" },
  { id: "suggest_edits", label: "Suggest Edits" },
  { id: "create_qa", label: "Create Q&A" },
  { id: "approve_qa", label: "Approve Q&A" },
  { id: "manage_tags", label: "Manage Tags" },
  { id: "review_ai_suggestions", label: "Review AI Suggestions" },
  { id: "view_audit_log", label: "View Audit Log" },
  { id: "manage_tasks", label: "Manage Tasks" },
  { id: "manage_users", label: "Manage Users" },
  { id: "manage_settings", label: "Manage Settings" },
  { id: "manage_roles", label: "Manage Roles" },
  { id: "export_data", label: "Export Data" },
  { id: "client_portal_access", label: "Client Portal Access" },
];

function CustomRolesPanel({ roles, queryClient, isAdmin }) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingRole, setEditingRole] = useState(null);

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-sm text-slate-500 text-center">
            Only administrators can manage custom roles.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-slate-500" />
                Custom Roles
              </CardTitle>
              <CardDescription>
                Define custom roles and assign permissions to users
              </CardDescription>
            </div>
            <Button
              onClick={() => setShowCreateDialog(true)}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              New Role
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {roles.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">
                No custom roles yet. Create one to get started.
              </p>
            ) : (
              roles.map((role) => (
                <div
                  key={role.id}
                  className="p-4 border border-slate-200 rounded-lg flex items-start justify-between"
                >
                  <div className="flex-1">
                    <h4 className="font-semibold text-slate-800">{role.name}</h4>
                    {role.description && (
                      <p className="text-sm text-slate-600 mt-1">
                        {role.description}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1 mt-3">
                      {role.permissions.slice(0, 4).map((perm) => (
                        <Badge key={perm} variant="secondary" className="text-xs">
                          {perm.replace(/_/g, " ")}
                        </Badge>
                      ))}
                      {role.permissions.length > 4 && (
                        <Badge variant="outline" className="text-xs">
                          +{role.permissions.length - 4}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingRole(role)}
                    >
                      <Edit2 className="w-4 h-4 text-slate-400" />
                    </Button>
                    <DeleteRoleButton role={role} queryClient={queryClient} />
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <CreateRoleDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        queryClient={queryClient}
      />

      {editingRole && (
        <EditRoleDialog
          role={editingRole}
          onClose={() => setEditingRole(null)}
          queryClient={queryClient}
        />
      )}
    </>
  );
}

function DeleteRoleButton({ role, queryClient }) {
  const mutation = useMutation({
    mutationFn: () => base44.entities.CustomRole.delete(role.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customRoles"] });
      toast.success("Role deleted");
    },
  });

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => mutation.mutate()}
      disabled={mutation.isPending}
    >
      <Trash2 className="w-4 h-4 text-red-500" />
    </Button>
  );
}

function CreateRoleDialog({ open, onOpenChange, queryClient }) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    permissions: [],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const mutation = useMutation({
    mutationFn: () => base44.entities.CustomRole.create(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customRoles"] });
      toast.success("Role created");
      onOpenChange(false);
      setFormData({ name: "", description: "", permissions: [] });
    },
  });

  const handleSubmit = async () => {
    if (!formData.name.trim() || formData.permissions.length === 0) return;
    setIsSubmitting(true);
    await mutation.mutateAsync();
    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New Role</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">
              Role Name *
            </label>
            <Input
              placeholder="e.g., Support Lead"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">
              Description
            </label>
            <Input
              placeholder="Role description..."
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-3 block">
              Permissions *
            </label>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {AVAILABLE_PERMISSIONS.map((perm) => (
                <label
                  key={perm.id}
                  className="flex items-center gap-2 p-2 rounded hover:bg-slate-50 cursor-pointer"
                >
                  <Checkbox
                    checked={formData.permissions.includes(perm.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setFormData({
                          ...formData,
                          permissions: [...formData.permissions, perm.id],
                        });
                      } else {
                        setFormData({
                          ...formData,
                          permissions: formData.permissions.filter(
                            (p) => p !== perm.id
                          ),
                        });
                      }
                    }}
                  />
                  <span className="text-sm text-slate-700">{perm.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !formData.name.trim()}
          >
            {isSubmitting ? "Creating..." : "Create Role"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditRoleDialog({ role, onClose, queryClient }) {
  const [formData, setFormData] = useState({
    name: role.name,
    description: role.description || "",
    permissions: role.permissions || [],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const mutation = useMutation({
    mutationFn: () =>
      base44.entities.CustomRole.update(role.id, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customRoles"] });
      toast.success("Role updated");
      onClose();
    },
  });

  const handleSubmit = async () => {
    if (!formData.name.trim()) return;
    setIsSubmitting(true);
    await mutation.mutateAsync();
    setIsSubmitting(false);
  };

  return (
    <Dialog open={!!role} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Role</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">
              Role Name
            </label>
            <Input
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">
              Description
            </label>
            <Input
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-3 block">
              Permissions
            </label>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {AVAILABLE_PERMISSIONS.map((perm) => (
                <label
                  key={perm.id}
                  className="flex items-center gap-2 p-2 rounded hover:bg-slate-50 cursor-pointer"
                >
                  <Checkbox
                    checked={formData.permissions.includes(perm.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setFormData({
                          ...formData,
                          permissions: [...formData.permissions, perm.id],
                        });
                      } else {
                        setFormData({
                          ...formData,
                          permissions: formData.permissions.filter(
                            (p) => p !== perm.id
                          ),
                        });
                      }
                    }}
                  />
                  <span className="text-sm text-slate-700">{perm.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Updating..." : "Update Role"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}