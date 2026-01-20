import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import {
  TrendingUp,
  FileText,
  MessageSquare,
  Users,
  Eye,
  Target,
  AlertCircle,
  Lightbulb,
  Loader2,
  BarChart3,
  Globe
} from "lucide-react";
import { cn } from "@/lib/utils";
import TagBadge from "@/components/ui/TagBadge";

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];

export default function Analytics() {
  const [timeframe, setTimeframe] = useState("30");
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: analytics, isLoading, refetch } = useQuery({
    queryKey: ['analytics', timeframe],
    queryFn: async () => {
      const response = await base44.functions.invoke('analyzeUsageMetrics', {
        timeframe: parseInt(timeframe)
      });
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  if (user?.role !== 'admin') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-slate-900">Admin Access Required</h2>
        <p className="text-slate-600 mt-2">Analytics dashboard is only available to administrators.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
      {/* Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-600 text-sm font-medium mb-4">
          <BarChart3 className="w-4 h-4" />
          <span>Analytics</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight">
              Knowledge Base Analytics
            </h1>
            <p className="mt-2 text-slate-600">
              AI-powered insights into usage, engagement, and content gaps
            </p>
          </div>
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        </div>
      ) : analytics ? (
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">Total Documents</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">
                      {analytics.summary.total_documents}
                    </p>
                    {analytics.summary.external_documents > 0 && (
                      <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                        <Globe className="w-3 h-3" />
                        {analytics.summary.external_documents} external
                      </p>
                    )}
                  </div>
                  <FileText className="w-8 h-8 text-indigo-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">AI Interactions</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">
                      {analytics.summary.total_ai_interactions}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Ask: {analytics.summary.ask_mode_usage} | Draft: {analytics.summary.draft_mode_usage}
                    </p>
                  </div>
                  <MessageSquare className="w-8 h-8 text-violet-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">Document Views</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">
                      {analytics.summary.total_views}
                    </p>
                  </div>
                  <Eye className="w-8 h-8 text-emerald-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">Recommendation Clicks</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">
                      {analytics.summary.recommendation_engagement}
                    </p>
                  </div>
                  <Target className="w-8 h-8 text-amber-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Documents */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
                Top Performing Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics.top_documents.map((doc, idx) => (
                  <div key={doc.id} className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-semibold text-sm">
                      #{idx + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-slate-900">{doc.title}</p>
                        {doc.external && (
                          <Badge variant="outline" className="text-xs gap-1">
                            <Globe className="w-3 h-3" />
                            External
                          </Badge>
                        )}
                      </div>
                      {doc.tags.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {doc.tags.slice(0, 3).map(tag => (
                            <TagBadge key={tag} tag={tag} size="sm" />
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-slate-700">
                        {doc.views} views
                      </p>
                      <p className="text-xs text-slate-500">
                        {doc.citations} citations
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Popular Topics & AI Engagement */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Popular Topics</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={analytics.popular_topics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="tag" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#6366f1" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>AI Feature Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Ask Mode', value: analytics.ai_feature_engagement.ask_mode },
                        { name: 'Draft Mode', value: analytics.ai_feature_engagement.draft_mode },
                        { name: 'Recommendations', value: analytics.ai_feature_engagement.recommendations }
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {[0, 1, 2].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Content Gaps */}
          {analytics.content_gaps?.length > 0 && (
            <Card className="border-amber-200 bg-amber-50/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-900">
                  <AlertCircle className="w-5 h-5" />
                  Content Gaps Identified
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics.content_gaps.map((gap, idx) => (
                    <div key={idx} className="p-4 bg-white rounded-lg border border-amber-200">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <p className="font-medium text-slate-900">{gap.topic}</p>
                          <p className="text-sm text-slate-600 mt-1">{gap.suggestion}</p>
                        </div>
                        <Badge className="bg-amber-100 text-amber-800">
                          {gap.frequency}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Underutilized Documents */}
          {analytics.underutilized_documents?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-violet-600" />
                  Underutilized Resources
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics.underutilized_analysis?.slice(0, 5).map((item, idx) => (
                    <div key={idx} className="p-4 bg-slate-50 rounded-lg">
                      <p className="font-medium text-slate-900 mb-1">{item.document}</p>
                      <p className="text-sm text-slate-600 mb-2">
                        <strong>Likely reason:</strong> {item.likely_reason}
                      </p>
                      <p className="text-sm text-violet-700">
                        <strong>Recommendation:</strong> {item.recommendation}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Improvement Suggestions */}
          {analytics.improvement_suggestions?.length > 0 && (
            <Card className="border-indigo-200 bg-indigo-50/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-indigo-900">
                  <Lightbulb className="w-5 h-5" />
                  AI Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {analytics.improvement_suggestions.map((suggestion, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-indigo-800">
                      <span className="text-indigo-600 mt-1">•</span>
                      <span>{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      ) : null}
    </div>
  );
}