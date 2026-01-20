import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch user's recent activity
    const [userEvents, documents, qas] = await Promise.all([
      base44.entities.AIEvent.filter({ user_id: user.id }, '-created_date', 20),
      base44.entities.Document.filter({ status: "active" }),
      base44.entities.CuratedQA.filter({ status: "approved" })
    ]);

    // Build user interest profile from activity
    const userQueries = userEvents.map(e => e.input).join(", ");
    const userTags = [...new Set(userEvents.flatMap(e => {
      try {
        const context = JSON.parse(e.context_json || '{}');
        return context.tags || [];
      } catch {
        return [];
      }
    }))];

    const contentContext = [
      ...documents.map((d, idx) => 
        `[${idx}] DOC: ${d.title}\nSummary: ${d.ai_summary || d.content?.substring(0, 300)}\nTags: ${d.tags?.join(", ")}\nCreated: ${d.created_date}`
      ),
      ...qas.map((q, idx) => 
        `[${idx + documents.length}] QA: ${q.question}\nAnswer: ${q.answer.substring(0, 200)}\nTags: ${q.tags?.join(", ")}`
      )
    ].join("\n\n---\n\n");

    const prompt = `Analyze user activity and recommend relevant content.

USER PROFILE:
- Recent queries: ${userQueries || "None"}
- Interest tags: ${userTags.join(", ") || "General"}
- Role: ${user.role}

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
    const allContent = [...documents, ...qas];
    const enrichedRecommendations = aiResponse.recommendations
      .filter(r => r.index >= 0 && r.index < allContent.length)
      .map(r => {
        const item = allContent[r.index];
        return {
          id: item.id,
          type: r.type,
          title: item.title || item.question,
          summary: item.ai_summary || item.answer?.substring(0, 200),
          tags: item.tags || [],
          relevance_score: r.relevance_score,
          reason: r.reason,
          category: r.category,
          created_date: item.created_date
        };
      });

    return Response.json({
      recommendations: enrichedRecommendations,
      insights: aiResponse.insights,
      user_profile: {
        queries_analyzed: userEvents.length,
        interest_tags: userTags
      }
    });

  } catch (error) {
    console.error("Recommendation error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});