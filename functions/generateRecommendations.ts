import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch user's recent activity and feedback
    const [userEvents, documents, qas, userFeedback, announcements] = await Promise.all([
      base44.entities.AIEvent.filter({ user_id: user.id }, '-created_date', 20),
      base44.entities.Document.filter({ status: "active" }),
      base44.entities.CuratedQA.filter({ status: "approved" }),
      base44.entities.RecommendationFeedback.filter({ user_id: user.id }),
      base44.entities.Announcement.list('-created_date', 5)
    ]);

    // Build user interest profile from activity and feedback
    const userQueries = userEvents.map(e => e.input).join(", ");
    const userTags = [...new Set(userEvents.flatMap(e => {
      try {
        const context = JSON.parse(e.context_json || '{}');
        return context.tags || [];
      } catch {
        return [];
      }
    }))];

    // Get feedback preferences
    const likedTags = [...new Set(userFeedback
      .filter(f => f.feedback_type === 'show_more' || f.feedback_type === 'helpful')
      .flatMap(f => f.tags || []))];
    const dislikedContent = userFeedback
      .filter(f => f.feedback_type === 'not_relevant')
      .map(f => f.content_id);

    // Filter out disliked content
    const availableDocuments = documents.filter(d => !dislikedContent.includes(d.id));
    const availableQAs = qas.filter(q => !dislikedContent.includes(q.id));

    // Calculate trending (most recently created/updated)
    const recentDocs = [...availableDocuments].sort((a, b) => 
      new Date(b.updated_date) - new Date(a.updated_date)
    ).slice(0, 5);

    // Filter announcements relevant to user
    const relevantAnnouncements = announcements.filter(a => {
      if (a.expires_at && new Date(a.expires_at) < new Date()) return false;
      if (a.target_roles && a.target_roles.length > 0 && !a.target_roles.includes(user.role)) return false;
      if (a.tags && a.tags.length > 0) {
        return a.tags.some(t => userTags.includes(t) || likedTags.includes(t));
      }
      return true;
    });

    const contentContext = [
      ...availableDocuments.map((d, idx) => 
        `[${idx}] DOC: ${d.title}\nSummary: ${d.ai_summary || d.content?.substring(0, 300)}\nTags: ${d.tags?.join(", ")}\nCreated: ${d.created_date}`
      ),
      ...availableQAs.map((q, idx) => 
        `[${idx + availableDocuments.length}] QA: ${q.question}\nAnswer: ${q.answer.substring(0, 200)}\nTags: ${q.tags?.join(", ")}`
      )
    ].join("\n\n---\n\n");

    const prompt = `Analyze user activity and recommend relevant content.

USER PROFILE:
- Recent queries: ${userQueries || "None"}
- Interest tags: ${userTags.join(", ") || "General"}
- Preferred tags (from feedback): ${likedTags.join(", ") || "None"}
- Role: ${user.role}

TRENDING RECENTLY UPDATED:
${recentDocs.map(d => d.title).join(", ")}

AVAILABLE CONTENT:
${contentContext}

TASK:
Based on user's recent activity and interests, recommend the top 8 most relevant items.
Consider:
- Topic relevance to recent queries
- Tag alignment with user interests
- Content freshness
- User role appropriateness

Return JSON:
{
  "recommendations": [
    {
      "index": number,
      "type": "document" or "qa",
      "relevance_score": 0.0-1.0,
      "reason": "why this is recommended",
      "category": "trending" | "related" | "new" | "popular"
    }
  ],
  "insights": "Brief personalized message about recommendations"
}`;

    const aiResponse = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          recommendations: {
            type: "array",
            items: {
              type: "object",
              properties: {
                index: { type: "number" },
                type: { type: "string" },
                relevance_score: { type: "number" },
                reason: { type: "string" },
                category: { type: "string" }
              }
            }
          },
          insights: { type: "string" }
        }
      }
    });

    // Map recommendations to actual content
    const allContent = [...availableDocuments, ...availableQAs];
    const enrichedRecommendations = aiResponse.recommendations
      .filter(r => r.index >= 0 && r.index < allContent.length)
      .map(r => {
        const item = allContent[r.index];
        const isTrending = recentDocs.some(d => d.id === item.id);
        return {
          id: item.id,
          type: r.type,
          title: item.title || item.question,
          summary: item.ai_summary || item.answer?.substring(0, 200),
          tags: item.tags || [],
          relevance_score: r.relevance_score,
          reason: r.reason,
          category: isTrending ? 'trending' : r.category,
          created_date: item.created_date,
          updated_date: item.updated_date
        };
      });

    return Response.json({
      recommendations: enrichedRecommendations,
      announcements: relevantAnnouncements.map(a => ({
        id: a.id,
        title: a.title,
        message: a.message,
        tags: a.tags || [],
        priority: a.priority || 'normal',
        created_date: a.created_date
      })),
      insights: aiResponse.insights,
      user_profile: {
        queries_analyzed: userEvents.length,
        interest_tags: userTags,
        preferred_tags: likedTags
      }
    });

  } catch (error) {
    console.error("Recommendation error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});