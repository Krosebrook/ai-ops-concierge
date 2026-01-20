import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { timeframe = 30 } = await req.json().catch(() => ({}));

    // Fetch data
    const [documents, aiEvents, documentViews, feedback, recommendations] = await Promise.all([
      base44.entities.Document.filter({ status: 'active' }),
      base44.entities.AIEvent.list('-created_date', 500),
      base44.entities.DocumentView.list('-created_date', 1000),
      base44.entities.Feedback.list('-created_date', 200),
      base44.entities.RecommendationFeedback.list('-created_date', 200)
    ]);

    // Calculate metrics
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - timeframe);

    const recentEvents = aiEvents.filter(e => new Date(e.created_date) > cutoffDate);
    const recentViews = documentViews.filter(v => new Date(v.created_date) > cutoffDate);

    // Document usage stats
    const docUsageMap = {};
    documents.forEach(doc => {
      docUsageMap[doc.id] = {
        id: doc.id,
        title: doc.title,
        tags: doc.tags || [],
        views: doc.view_count || 0,
        citations: 0,
        last_viewed: null,
        external: doc.is_external || false
      };
    });

    recentViews.forEach(view => {
      if (docUsageMap[view.document_id]) {
        docUsageMap[view.document_id].views++;
        const viewDate = new Date(view.created_date);
        if (!docUsageMap[view.document_id].last_viewed || viewDate > new Date(docUsageMap[view.document_id].last_viewed)) {
          docUsageMap[view.document_id].last_viewed = view.created_date;
        }
      }
    });

    recentEvents.forEach(event => {
      if (event.sources) {
        event.sources.forEach(source => {
          const docId = source.document_id;
          if (docUsageMap[docId]) {
            docUsageMap[docId].citations++;
          }
        });
      }
    });

    const topDocuments = Object.values(docUsageMap)
      .sort((a, b) => (b.views + b.citations * 2) - (a.views + a.citations * 2))
      .slice(0, 10);

    const underutilizedDocs = Object.values(docUsageMap)
      .filter(d => d.views === 0 && d.citations === 0)
      .slice(0, 10);

    // Popular topics (from tags)
    const tagCounts = {};
    recentEvents.forEach(event => {
      try {
        const context = JSON.parse(event.context_json || '{}');
        (context.tags || []).forEach(tag => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      } catch {}
    });

    documents.forEach(doc => {
      (doc.tags || []).forEach(tag => {
        const docViews = docUsageMap[doc.id]?.views || 0;
        tagCounts[tag] = (tagCounts[tag] || 0) + docViews;
      });
    });

    const popularTopics = Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // AI feature engagement
    const askModeUsage = recentEvents.filter(e => e.mode === 'ask').length;
    const draftModeUsage = recentEvents.filter(e => e.mode === 'draft').length;
    const recommendationClicks = recommendations.filter(r => 
      r.feedback_type === 'helpful' || r.feedback_type === 'show_more'
    ).length;

    // User queries analysis
    const userQueries = recentEvents.map(e => e.input).join('\n');
    
    const gapAnalysisPrompt = `Analyze these user queries and knowledge base to identify content gaps.

USER QUERIES (last ${timeframe} days):
${userQueries.slice(0, 5000)}

EXISTING DOCUMENTS:
${documents.slice(0, 20).map(d => `- ${d.title} (${d.tags?.join(', ')})`).join('\n')}

UNDERUTILIZED DOCUMENTS:
${underutilizedDocs.map(d => d.title).join(', ')}

Identify:
1. Common questions without good answers (content gaps)
2. Topics users ask about but aren't covered
3. Why underutilized docs aren't being used
4. Suggestions to improve knowledge base

Return JSON with actionable insights.`;

    const gapAnalysis = await base44.integrations.Core.InvokeLLM({
      prompt: gapAnalysisPrompt,
      response_json_schema: {
        type: "object",
        properties: {
          content_gaps: {
            type: "array",
            items: {
              type: "object",
              properties: {
                topic: { type: "string" },
                frequency: { type: "string" },
                suggestion: { type: "string" }
              }
            }
          },
          underutilized_analysis: {
            type: "array",
            items: {
              type: "object",
              properties: {
                document: { type: "string" },
                likely_reason: { type: "string" },
                recommendation: { type: "string" }
              }
            }
          },
          improvement_suggestions: {
            type: "array",
            items: { type: "string" }
          }
        }
      }
    });

    return Response.json({
      timeframe_days: timeframe,
      summary: {
        total_documents: documents.length,
        external_documents: documents.filter(d => d.is_external).length,
        total_ai_interactions: recentEvents.length,
        ask_mode_usage: askModeUsage,
        draft_mode_usage: draftModeUsage,
        total_views: recentViews.length,
        recommendation_engagement: recommendationClicks
      },
      top_documents: topDocuments,
      popular_topics: popularTopics,
      underutilized_documents: underutilizedDocs,
      ai_feature_engagement: {
        ask_mode: askModeUsage,
        draft_mode: draftModeUsage,
        recommendations: recommendationClicks,
        avg_confidence: recentEvents.filter(e => e.confidence).length > 0
          ? recentEvents.filter(e => e.confidence).reduce((sum, e) => {
              const score = e.confidence === 'high' ? 3 : e.confidence === 'medium' ? 2 : 1;
              return sum + score;
            }, 0) / recentEvents.filter(e => e.confidence).length
          : 0
      },
      content_gaps: gapAnalysis.content_gaps || [],
      underutilized_analysis: gapAnalysis.underutilized_analysis || [],
      improvement_suggestions: gapAnalysis.improvement_suggestions || []
    });

  } catch (error) {
    console.error("Analytics error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});