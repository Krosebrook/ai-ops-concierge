import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get recent AI events (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const aiEvents = await base44.entities.AIEvent.list('-created_date', 500);
    const recentEvents = aiEvents.filter(e => 
      new Date(e.created_date) > thirtyDaysAgo && e.confidence === 'low'
    );

    // Get existing documents and QAs for comparison
    const documents = await base44.entities.Document.filter({ status: 'active' });
    const qas = await base44.entities.CuratedQA.filter({ status: 'approved' });
    const existingGaps = await base44.entities.ContentGap.list();

    // Build context of existing content
    const existingTopics = [
      ...documents.map(d => ({ title: d.title, tags: d.tags || [], content: d.content || '' })),
      ...qas.map(q => ({ title: q.question, tags: q.tags || [], content: q.answer || '' }))
    ];

    // Analyze events to find patterns of low-confidence responses
    const topicClusters = {};
    
    for (const event of recentEvents) {
      const key = event.input.toLowerCase().substring(0, 100);
      if (!topicClusters[key]) {
        topicClusters[key] = {
          queries: [],
          confidences: [],
          tags: new Set()
        };
      }
      topicClusters[key].queries.push(event.input);
      topicClusters[key].confidences.push(event.confidence);
      
      // Extract potential tags from context
      if (event.context_json) {
        try {
          const context = JSON.parse(event.context_json);
          if (context.urgency) topicClusters[key].tags.add(context.urgency);
          if (context.customer_type) topicClusters[key].tags.add(context.customer_type);
        } catch {}
      }
    }

    // Use AI to analyze and identify real gaps
    const clusterAnalysis = Object.entries(topicClusters)
      .filter(([_, data]) => data.queries.length >= 2) // At least 2 similar queries
      .map(([_, data]) => ({
        example_query: data.queries[0],
        frequency: data.queries.length,
        tags: Array.from(data.tags)
      }))
      .slice(0, 20); // Limit to top 20 patterns

    if (clusterAnalysis.length === 0) {
      return Response.json({ gaps: [], message: 'No significant content gaps identified' });
    }

    const analysisPrompt = `You are analyzing customer support queries to identify content gaps.

Existing content topics:
${existingTopics.slice(0, 30).map(t => `- ${t.title}`).join('\n')}

Recent low-confidence query patterns (indicating potential gaps):
${clusterAnalysis.map((c, i) => `${i + 1}. "${c.example_query}" (asked ${c.frequency}x)`).join('\n')}

Identify 3-5 real content gaps where documentation is missing or insufficient. For each gap:
- Focus on topics that are frequently asked but not well-covered in existing content
- Provide a clear topic title
- Explain what content is missing
- Suggest appropriate tags
- Recommend content type (document for detailed guides, qa for quick answers)
- Assign priority (high if asked 5+ times, medium if 3-4 times, low if 2 times)

Return ONLY valid JSON matching this schema:
{
  "gaps": [
    {
      "topic": "string",
      "description": "string", 
      "suggested_tags": ["string"],
      "frequency": number,
      "priority": "low" | "medium" | "high",
      "suggested_content_type": "document" | "qa" | "both"
    }
  ]
}`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: analysisPrompt,
      response_json_schema: {
        type: "object",
        properties: {
          gaps: {
            type: "array",
            items: {
              type: "object",
              properties: {
                topic: { type: "string" },
                description: { type: "string" },
                suggested_tags: { type: "array", items: { type: "string" } },
                frequency: { type: "number" },
                priority: { type: "string" },
                suggested_content_type: { type: "string" }
              }
            }
          }
        }
      }
    });

    const identifiedGaps = result.gaps || [];

    // Create or update ContentGap records
    const createdGaps = [];
    for (const gap of identifiedGaps) {
      // Check if similar gap already exists
      const existing = existingGaps.find(eg => 
        eg.topic.toLowerCase().includes(gap.topic.toLowerCase()) ||
        gap.topic.toLowerCase().includes(eg.topic.toLowerCase())
      );

      if (existing && existing.status !== 'addressed') {
        // Update frequency
        await base44.asServiceRole.entities.ContentGap.update(existing.id, {
          frequency: existing.frequency + (gap.frequency || 1),
          query_examples: [...(existing.query_examples || []), 
            ...clusterAnalysis.filter(c => 
              c.example_query.toLowerCase().includes(gap.topic.toLowerCase())
            ).map(c => c.example_query)
          ].slice(0, 10)
        });
        createdGaps.push({ ...existing, updated: true });
      } else if (!existing) {
        // Create new gap
        const queryExamples = clusterAnalysis
          .filter(c => c.example_query.toLowerCase().includes(gap.topic.toLowerCase()))
          .map(c => c.example_query)
          .slice(0, 5);

        const newGap = await base44.asServiceRole.entities.ContentGap.create({
          topic: gap.topic,
          description: gap.description,
          suggested_tags: gap.suggested_tags || [],
          frequency: gap.frequency || 1,
          priority: gap.priority || 'medium',
          status: 'identified',
          suggested_content_type: gap.suggested_content_type || 'document',
          query_examples: queryExamples,
          confidence_scores: ['low']
        });
        createdGaps.push(newGap);
      }
    }

    return Response.json({
      gaps: createdGaps,
      analyzed_events: recentEvents.length,
      patterns_found: clusterAnalysis.length
    });

  } catch (error) {
    console.error('Content gap analysis error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});