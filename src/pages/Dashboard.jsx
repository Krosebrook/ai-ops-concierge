import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer
} from "recharts";
import {
  TrendingUp, MessageSquare, FileText, CheckCircle2,
  Activity, Clock, Zap, Target, Eye, Star, ArrowUpRight,
  ArrowDownRight, Minus, LayoutDashboard, BookOpen, ClipboardList,
  Loader2, Users, BarChart3, Flame
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, subDays, startOfDay, parseISO, differenceInDays } from "date-fns";

const PALETTE = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#14b8a6"];

function StatCard({ label, value, sub, icon: Icon, color, trend, trendValue }) {
  const trendColors = { up: "text-emerald-600", down: "text-red-500", flat: "text-slate-400" };
  const TrendIcon = trend === "up" ? ArrowUpRight : trend === "down" ? ArrowDownRight : Minus;
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</p>
            <p className="text-3xl font-bold text-slate-900 mt-1">{value}</p>
            {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
            {trendValue !== undefined && (
              <div className={cn("flex items-center gap-1 mt-2 text-xs font-medium", trendColors[trend])}>
                <TrendIcon className="w-3.5 h-3.5" />
                {trendValue}
              </div>
            )}
          </div>
          <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", color)}>
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SectionTitle({ icon: Icon, title, color = "text-indigo-600" }) {
  return (
    <div className={cn("flex items-center gap-2 text-base font-semibold", color)}>
      <Icon className="w-5 h-5" />
      {title}
    </div>
  );
}

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [timeframe, setTimeframe] = useState("30");

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  // Fetch raw data in parallel
  const { data: aiEvents = [], isLoading: loadingEvents } = useQuery({
    queryKey: ["dashboard-ai-events", user?.id],
    queryFn: () => base44.entities.AIEvent.filter({ user_id: user?.id }, "-created_date", 200),
    enabled: !!user?.id,
  });

  const { data: activities = [], isLoading: loadingActivities } = useQuery({
    queryKey: ["dashboard-activities", user?.id],
    queryFn: () => base44.entities.UserActivity.filter({ user_id: user?.id }, "-created_date", 200),
    enabled: !!user?.id,
  });

  const { data: tasks = [], isLoading: loadingTasks } = useQuery({
    queryKey: ["dashboard-tasks"],
    queryFn: () => base44.entities.Task.list("-created_date", 200),
    enabled: !!user,
  });

  const { data: contentGaps = [] } = useQuery({
    queryKey: ["dashboard-gaps"],
    queryFn: () => base44.entities.ContentGap.list("-created_date", 50),
    enabled: !!user,
  });

  const isLoading = loadingEvents || loadingActivities || loadingTasks;

  // --- Computed metrics ---
  const metrics = useMemo(() => {
    const days = parseInt(timeframe);
    const since = subDays(new Date(), days);

    const recentEvents = aiEvents.filter(e => new Date(e.created_date) >= since);
    const recentActivities = activities.filter(a => new Date(a.created_date) >= since);
    const myTasks = tasks.filter(t => t.assigned_user_id === user?.id || t.created_by === user?.email);
    const recentTasks = myTasks.filter(t => new Date(t.created_date) >= since);

    // --- Activity trend (daily breakdown) ---
    const trendMap = {};
    for (let i = days - 1; i >= 0; i--) {
      const d = format(subDays(new Date(), i), "MMM d");
      trendMap[d] = { date: d, queries: 0, views: 0, drafts: 0 };
    }
    recentEvents.forEach(e => {
      const d = format(new Date(e.created_date), "MMM d");
      if (trendMap[d]) {
        if (e.mode === "ask") trendMap[d].queries++;
        if (e.mode === "draft") trendMap[d].drafts++;
      }
    });
    recentActivities.forEach(a => {
      const d = format(new Date(a.created_date), "MMM d");
      if (trendMap[d] && a.activity_type === "document_view") trendMap[d].views++;
    });
    const activityTrend = Object.values(trendMap);

    // --- AI mode split ---
    const askCount = recentEvents.filter(e => e.mode === "ask").length;
    const draftCount = recentEvents.filter(e => e.mode === "draft").length;
    const aiModeSplit = [
      { name: "Ask Mode", value: askCount },
      { name: "Draft Mode", value: draftCount },
    ].filter(d => d.value > 0);

    // --- Confidence distribution ---
    const confMap = { high: 0, medium: 0, low: 0 };
    recentEvents.filter(e => e.confidence).forEach(e => { confMap[e.confidence]++; });
    const confDist = [
      { level: "High", count: confMap.high, fill: "#10b981" },
      { level: "Medium", count: confMap.medium, fill: "#f59e0b" },
      { level: "Low", count: confMap.low, fill: "#ef4444" },
    ];

    // --- Task status distribution ---
    const taskStatusMap = { open: 0, in_progress: 0, completed: 0, cancelled: 0 };
    recentTasks.forEach(t => { taskStatusMap[t.status]++; });
    const taskDist = [
      { name: "Open", value: taskStatusMap.open },
      { name: "In Progress", value: taskStatusMap.in_progress },
      { name: "Completed", value: taskStatusMap.completed },
      { name: "Cancelled", value: taskStatusMap.cancelled },
    ].filter(d => d.value > 0);

    // --- Task completion trend ---
    const taskTrendMap = {};
    for (let i = Math.min(days - 1, 13); i >= 0; i--) {
      const d = format(subDays(new Date(), i), "MMM d");
      taskTrendMap[d] = { date: d, created: 0, completed: 0 };
    }
    recentTasks.forEach(t => {
      const d = format(new Date(t.created_date), "MMM d");
      if (taskTrendMap[d]) taskTrendMap[d].created++;
      if (t.status === "completed" && t.updated_date) {
        const ud = format(new Date(t.updated_date), "MMM d");
        if (taskTrendMap[ud]) taskTrendMap[ud].completed++;
      }
    });
    const taskTrend = Object.values(taskTrendMap);

    // --- Activity type breakdown ---
    const actTypeMap = {};
    recentActivities.forEach(a => {
      const label = a.activity_type?.replace(/_/g, " ") || "other";
      actTypeMap[label] = (actTypeMap[label] || 0) + 1;
    });
    const actTypeData = Object.entries(actTypeMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    // --- KPIs ---
    const completedTasks = recentTasks.filter(t => t.status === "completed").length;
    const taskCompletionRate = recentTasks.length > 0
      ? Math.round((completedTasks / recentTasks.length) * 100)
      : 0;

    const highConfCount = confMap.high;
    const totalWithConf = confMap.high + confMap.medium + confMap.low;
    const highConfRate = totalWithConf > 0 ? Math.round((highConfCount / totalWithConf) * 100) : 0;

    // Compare to previous period for trend arrows
    const prevSince = subDays(since, days);
    const prevEvents = aiEvents.filter(e => {
      const d = new Date(e.created_date);
      return d >= prevSince && d < since;
    });
    const interactionTrend = recentEvents.length >= prevEvents.length ? "up" : "down";
    const interactionDiff = recentEvents.length - prevEvents.length;

    return {
      activityTrend,
      aiModeSplit,
      confDist,
      taskDist,
      taskTrend,
      actTypeData,
      totalInteractions: recentEvents.length,
      askCount,
      draftCount,
      totalActivities: recentActivities.length,
      completedTasks,
      totalMyTasks: recentTasks.length,
      taskCompletionRate,
      highConfRate,
      interactionTrend,
      interactionDiff,
      openGaps: contentGaps.filter(g => g.status === "identified").length,
    };
  }, [aiEvents, activities, tasks, contentGaps, timeframe, user]);

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-600 text-sm font-medium mb-3">
            <LayoutDashboard className="w-4 h-4" />
            My Dashboard
          </div>
          <h1 className="text-3xl font-bold text-slate-900">
            Welcome back, {user.full_name?.split(" ")[0] || "there"} 👋
          </h1>
          <p className="text-slate-500 mt-1">Here's a snapshot of your activity and performance.</p>
        </div>
        <Select value={timeframe} onValueChange={setTimeframe}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="14">Last 14 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
        </div>
      ) : (
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-slate-100 p-1">
            <TabsTrigger value="overview" className="gap-2 text-sm">
              <BarChart3 className="w-4 h-4" /> Overview
            </TabsTrigger>
            <TabsTrigger value="ai" className="gap-2 text-sm">
              <Zap className="w-4 h-4" /> AI Usage
            </TabsTrigger>
            <TabsTrigger value="tasks" className="gap-2 text-sm">
              <ClipboardList className="w-4 h-4" /> Tasks
            </TabsTrigger>
            <TabsTrigger value="activity" className="gap-2 text-sm">
              <Activity className="w-4 h-4" /> Activity
            </TabsTrigger>
          </TabsList>

          {/* ====== OVERVIEW ====== */}
          <TabsContent value="overview" className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label="AI Interactions"
                value={metrics.totalInteractions}
                sub={`Ask: ${metrics.askCount} · Draft: ${metrics.draftCount}`}
                icon={MessageSquare}
                color="bg-gradient-to-br from-indigo-500 to-violet-600"
                trend={metrics.interactionTrend}
                trendValue={`${metrics.interactionDiff >= 0 ? "+" : ""}${metrics.interactionDiff} vs prev. period`}
              />
              <StatCard
                label="Tasks Completed"
                value={metrics.completedTasks}
                sub={`${metrics.taskCompletionRate}% completion rate`}
                icon={CheckCircle2}
                color="bg-gradient-to-br from-emerald-500 to-teal-500"
                trend={metrics.taskCompletionRate >= 70 ? "up" : metrics.taskCompletionRate >= 40 ? "flat" : "down"}
                trendValue={`${metrics.taskCompletionRate}% rate`}
              />
              <StatCard
                label="High Confidence Rate"
                value={`${metrics.highConfRate}%`}
                sub="of AI responses"
                icon={Star}
                color="bg-gradient-to-br from-amber-400 to-orange-500"
                trend={metrics.highConfRate >= 60 ? "up" : "flat"}
                trendValue={metrics.highConfRate >= 60 ? "Good quality" : "Needs improvement"}
              />
              <StatCard
                label="Content Gaps Open"
                value={metrics.openGaps}
                sub="unaddressed topics"
                icon={Target}
                color="bg-gradient-to-br from-rose-500 to-pink-600"
                trend={metrics.openGaps === 0 ? "up" : metrics.openGaps <= 3 ? "flat" : "down"}
                trendValue={metrics.openGaps === 0 ? "All clear!" : `${metrics.openGaps} to address`}
              />
            </div>

            {/* Activity Trend + AI Mode Split */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
                <CardHeader className="pb-2">
                  <SectionTitle icon={Activity} title="Activity Trend" />
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={metrics.activityTrend} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
                      <defs>
                        <linearGradient id="gradQ" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gradD" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} />
                      <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0" }} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Area type="monotone" dataKey="queries" stroke="#6366f1" fill="url(#gradQ)" strokeWidth={2} name="Ask Queries" dot={false} />
                      <Area type="monotone" dataKey="drafts" stroke="#8b5cf6" fill="url(#gradD)" strokeWidth={2} name="Drafts" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <SectionTitle icon={Zap} title="AI Mode Split" color="text-violet-600" />
                </CardHeader>
                <CardContent>
                  {metrics.aiModeSplit.length > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie
                            data={metrics.aiModeSplit}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={85}
                            paddingAngle={4}
                            dataKey="value"
                          >
                            {metrics.aiModeSplit.map((_, i) => (
                              <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex flex-col gap-2 mt-2">
                        {metrics.aiModeSplit.map((d, i) => (
                          <div key={d.name} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full" style={{ background: PALETTE[i] }} />
                              <span className="text-slate-600">{d.name}</span>
                            </div>
                            <span className="font-semibold text-slate-800">{d.value}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                      <MessageSquare className="w-8 h-8 mb-2 opacity-40" />
                      <p className="text-sm">No AI interactions yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Task + Confidence summary */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <SectionTitle icon={ClipboardList} title="Task Status Overview" color="text-emerald-600" />
                </CardHeader>
                <CardContent>
                  {metrics.taskDist.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={metrics.taskDist} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} tickLine={false} />
                        <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} allowDecimals={false} />
                        <Tooltip contentStyle={{ borderRadius: 8 }} />
                        <Bar dataKey="value" radius={[6, 6, 0, 0]} name="Tasks">
                          {metrics.taskDist.map((_, i) => (
                            <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                      <ClipboardList className="w-8 h-8 mb-2 opacity-40" />
                      <p className="text-sm">No tasks in this period</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <SectionTitle icon={Star} title="AI Confidence Distribution" color="text-amber-600" />
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={metrics.confDist} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="level" tick={{ fontSize: 12 }} tickLine={false} />
                      <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={{ borderRadius: 8 }} />
                      <Bar dataKey="count" radius={[6, 6, 0, 0]} name="Responses">
                        {metrics.confDist.map((d, i) => (
                          <Cell key={i} fill={d.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ====== AI USAGE ====== */}
          <TabsContent value="ai" className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard label="Total Queries" value={metrics.askCount} icon={MessageSquare} color="bg-gradient-to-br from-indigo-500 to-violet-600" />
              <StatCard label="Total Drafts" value={metrics.draftCount} icon={FileText} color="bg-gradient-to-br from-violet-500 to-purple-600" />
              <StatCard label="High Confidence Rate" value={`${metrics.highConfRate}%`} icon={Star} color="bg-gradient-to-br from-amber-400 to-orange-500" />
            </div>

            <Card>
              <CardHeader className="pb-2">
                <SectionTitle icon={Activity} title="AI Interactions Over Time" />
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={metrics.activityTrend} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
                    <defs>
                      <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} axisLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ borderRadius: 8 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Area type="monotone" dataKey="queries" stroke="#6366f1" fill="url(#g1)" strokeWidth={2} name="Ask Queries" dot={false} />
                    <Area type="monotone" dataKey="drafts" stroke="#ec4899" fill="url(#g2)" strokeWidth={2} name="Drafts" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <SectionTitle icon={Star} title="Confidence Breakdown" color="text-amber-600" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 mt-2">
                    {metrics.confDist.map(d => {
                      const total = metrics.confDist.reduce((s, x) => s + x.count, 0);
                      const pct = total > 0 ? Math.round((d.count / total) * 100) : 0;
                      return (
                        <div key={d.level}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium text-slate-700">{d.level} Confidence</span>
                            <span className="text-slate-500">{d.count} ({pct}%)</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2.5">
                            <div
                              className="h-2.5 rounded-full transition-all duration-500"
                              style={{ width: `${pct}%`, background: d.fill }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <SectionTitle icon={Flame} title="Recent AI Events" color="text-rose-600" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                    {aiEvents.slice(0, 8).map(ev => (
                      <div key={ev.id} className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                        <div className={cn(
                          "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5",
                          ev.mode === "ask" ? "bg-indigo-100" : "bg-violet-100"
                        )}>
                          {ev.mode === "ask"
                            ? <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
                            : <FileText className="w-3.5 h-3.5 text-violet-600" />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-800 truncate font-medium">{ev.input?.slice(0, 60) || "—"}{ev.input?.length > 60 ? "…" : ""}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-slate-400">{format(new Date(ev.created_date), "MMM d, h:mma")}</span>
                            {ev.confidence && (
                              <Badge className={cn("text-[10px] px-1.5 py-0",
                                ev.confidence === "high" ? "bg-emerald-100 text-emerald-700" :
                                ev.confidence === "medium" ? "bg-amber-100 text-amber-700" :
                                "bg-red-100 text-red-700"
                              )}>
                                {ev.confidence}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {aiEvents.length === 0 && (
                      <p className="text-sm text-slate-400 text-center py-8">No AI events yet</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ====== TASKS ====== */}
          <TabsContent value="tasks" className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard label="My Tasks" value={metrics.totalMyTasks} icon={ClipboardList} color="bg-gradient-to-br from-indigo-500 to-violet-600" />
              <StatCard label="Completed" value={metrics.completedTasks} icon={CheckCircle2} color="bg-gradient-to-br from-emerald-500 to-teal-500" />
              <StatCard label="Completion Rate" value={`${metrics.taskCompletionRate}%`} icon={Target} color="bg-gradient-to-br from-amber-400 to-orange-500" />
              <StatCard label="Open Tasks" value={metrics.taskDist.find(d => d.name === "Open")?.value || 0} icon={Clock} color="bg-gradient-to-br from-rose-500 to-pink-600" />
            </div>

            <Card>
              <CardHeader className="pb-2">
                <SectionTitle icon={TrendingUp} title="Task Completion Trend" color="text-emerald-600" />
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={metrics.taskTrend} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ borderRadius: 8 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="created" stroke="#6366f1" strokeWidth={2} dot={false} name="Created" />
                    <Line type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={2} dot={false} name="Completed" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <SectionTitle icon={BarChart3} title="Status Distribution" />
                </CardHeader>
                <CardContent>
                  {metrics.taskDist.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={metrics.taskDist} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3} dataKey="value">
                          {metrics.taskDist.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                        </Pie>
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-48 text-slate-400">
                      <p className="text-sm">No tasks in this period</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <SectionTitle icon={Flame} title="Recent Tasks" color="text-rose-600" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {tasks.filter(t => t.assigned_user_id === user?.id || t.created_by === user?.email).slice(0, 7).map(task => (
                      <div key={task.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-50">
                        <div className={cn("w-2 h-2 rounded-full flex-shrink-0",
                          task.status === "completed" ? "bg-emerald-500" :
                          task.status === "in_progress" ? "bg-indigo-500" :
                          task.status === "cancelled" ? "bg-slate-300" : "bg-amber-400"
                        )} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">{task.title}</p>
                          <p className="text-xs text-slate-400">{format(new Date(task.created_date), "MMM d")}</p>
                        </div>
                        <Badge className={cn("text-[10px] px-1.5 py-0 capitalize",
                          task.priority === "urgent" ? "bg-red-100 text-red-700" :
                          task.priority === "high" ? "bg-orange-100 text-orange-700" :
                          task.priority === "medium" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"
                        )}>
                          {task.priority}
                        </Badge>
                      </div>
                    ))}
                    {tasks.filter(t => t.assigned_user_id === user?.id || t.created_by === user?.email).length === 0 && (
                      <p className="text-sm text-slate-400 text-center py-8">No tasks found</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ====== ACTIVITY ====== */}
          <TabsContent value="activity" className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <StatCard label="Total Activities" value={metrics.totalActivities} icon={Activity} color="bg-gradient-to-br from-indigo-500 to-violet-600" />
              <StatCard label="AI Interactions" value={metrics.totalInteractions} icon={Zap} color="bg-gradient-to-br from-amber-400 to-orange-500" />
            </div>

            <Card>
              <CardHeader className="pb-2">
                <SectionTitle icon={BarChart3} title="Activity Type Breakdown" />
              </CardHeader>
              <CardContent>
                {metrics.actTypeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={metrics.actTypeData} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} width={120} />
                      <Tooltip contentStyle={{ borderRadius: 8 }} />
                      <Bar dataKey="count" radius={[0, 6, 6, 0]} name="Count">
                        {metrics.actTypeData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                    <Activity className="w-8 h-8 mb-2 opacity-40" />
                    <p className="text-sm">No activity data in this period</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <SectionTitle icon={Activity} title="Daily Activity Volume" />
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={metrics.activityTrend} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
                    <defs>
                      <linearGradient id="gAct" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ borderRadius: 8 }} />
                    <Area type="monotone" dataKey="views" stroke="#10b981" fill="url(#gAct)" strokeWidth={2} name="Doc Views" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}