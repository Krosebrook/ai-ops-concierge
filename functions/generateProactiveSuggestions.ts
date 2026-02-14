import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get recent user activity (last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const allActivities = await base44.entities.UserActivity.filter({ user_id: user.id }, '-created_date', 50);
    
    const recentActivities = allActivities.filter(a => 
      new Date(a.created_date) > oneHourAgo
    );

    if (recentActivities.length === 0) {
      return Response.json({ suggestions: [] });
    }

    // Analyze activity patterns
    const viewedDocs = recentActivities
      .filter(a => a.activity_type === 'document_view')
      .map(a => a.activity_context?.document_title)
      .filter(Boolean);
    
    const recentQueries = recentActivities
      .filter(a => a.activity_type === 'query')
      .map(a => a.activity_context?.query_text)
      .filter(Boolean);

    const viewedTags = recentActivities
      .flatMap(a => a.activity_context?.tags || [])
      .filter(Boolean);

    // Get all documents and QAs for recommendations
    const [allDocs, allQAs] = await Promise.all([
      base44.entities.Document.list('-view_count', 100),
      base44.entities.CuratedQA.filter({ status: 'approved' }, '-created_date', 50)
    ]);

    // Use AI to generate contextual suggestions
    const prompt = `Based on the user's recent activity, suggest 3-5 proactive recommendations:

Recent Documents Viewed: ${viewedDocs.slice(0, 5).join(', ') || 'None'}
Recent Queries: ${recentQueries.slice(0, 3).join(', ') || 'None'}
Interested Tags: ${[...new Set(viewedTags)].slice(0, 5).join(', ') || 'None'}

Available Documents: ${allDocs.slice(0, 10).map(d => `${d.title} (tags: ${d.tags?.join(', ')})`).join('; ')}

Provide suggestions for:
1. Related documents they haven't seen yet
2. Relevant Q&As
3. Follow-up questions they might have
4. Areas they might want to explore next

Return JSON array of suggestions with type, title, description, relevance_score (0-1), and action.`;

    const aiResponse = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          suggestions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                type: { type: "string", enum: ["document", "qa", "question", "exploration"] },
                title: { type: "string" },
                description: { type: "string" },
                relevance_score: { type: "number" },
                action: { type: "string" },
                related_document_id: { type: "string" }
              }
            }
          }
        }
      }
    });

    // Enrich suggestions with real document/QA IDs
    const enrichedSuggestions = aiResponse.suggestions.map(suggestion => {
      if (suggestion.type === 'document') {
        const doc = allDocs.find(d => 
          d.title.toLowerCase().includes(suggestion.title.toLowerCase()) ||
          suggestion.title.toLowerCase().includes(d.title.toLowerCase())
        );
        if (doc) {
          suggestion.related_document_id = doc.id;
          suggestion.document_title = doc.title;
        }
      } else if (suggestion.type === 'qa') {
        const qa = allQAs.find(q => 
          q.question.toLowerCase().includes(suggestion.title.toLowerCase()) ||
          suggestion.title.toLowerCase().includes(q.question.toLowerCase())
        );
        if (qa) {
          suggestion.related_qa_id = qa.id;
          suggestion.qa_question = qa.question;
        }
      }
      return suggestion;
    });

    return Response.json({
      suggestions: enrichedSuggestions.filter(s => s.relevance_score > 0.5)
    });

  } catch (error) {
    console.error('Proactive suggestions error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});