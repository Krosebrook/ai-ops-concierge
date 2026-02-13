import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Analyze recent AI events (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const allEvents = await base44.asServiceRole.entities.AIEvent.list('-created_date', 500);
    
    const recentEvents = allEvents.filter(e => 
      new Date(e.created_date) > thirtyDaysAgo
    );

    // Find patterns: low confidence or escalations
    const problematicEvents = recentEvents.filter(e => 
      e.confidence === 'low' || e.escalation_target
    );

    // Group by similar queries using AI
    const queryGroups = {};
    
    for (const event of problematicEvents) {
      const query = event.input?.toLowerCase() || '';
      
      // Simple keyword extraction
      const keywords = query.split(' ')
        .filter(w => w.length > 4)
        .slice(0, 3)
        .join(' ');
      
      if (!queryGroups[keywords]) {
        queryGroups[keywords] = [];
      }
      queryGroups[keywords].push(event);
    }

    // Filter groups with multiple occurrences
    const significantGaps = Object.entries(queryGroups)
      .filter(([_, events]) => events.length >= 2)
      .map(([keywords, events]) => ({
        keywords,
        events,
        frequency: events.length
      }));

    // Use AI to analyze and suggest content gaps
    const gaps = [];
    
    for (const group of significantGaps.slice(0, 10)) {
      const sampleQueries = group.events.slice(0, 3).map(e => e.input);
      const avgConfidence = group.events.filter(e => e.confidence).length;
      const escalationCount = group.events.filter(e => e.escalation_target).length;

      const prompt = `Analyze these similar user queries that resulted in low confidence or escalation:

Queries:
${sampleQueries.join('\n- ')}

Frequency: ${group.frequency} times in 30 days
Low confidence: ${avgConfidence}
Escalations: ${escalationCount}

Provide:
1. A clear topic/theme these queries share
2. Suggested content type (document, Q&A, or process guide)
3. Brief description of what content should cover
4. Suggested tags

Return JSON.`;

      const analysis = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            topic: { type: "string" },
            content_type: { type: "string" },
            description: { type: "string" },
            suggested_tags: { type: "array", items: { type: "string" } }
          }
        }
      });

      // Check if gap already exists
      const existing = await base44.asServiceRole.entities.ContentGap.filter({
        topic: analysis.topic
      });

      if (existing.length === 0) {
        // Create new gap
        const gap = await base44.asServiceRole.entities.ContentGap.create({
          topic: analysis.topic,
          description: analysis.description,
          suggested_tags: analysis.suggested_tags || [],
          frequency: group.frequency,
          query_examples: sampleQueries,
          confidence_scores: group.events.map(e => e.confidence || 'unknown'),
          priority: group.frequency >= 5 ? 'high' : group.frequency >= 3 ? 'medium' : 'low',
          status: 'identified',
          suggested_content_type: analysis.content_type || 'document'
        });
        gaps.push(gap);
      } else {
        // Update existing gap
        const existingGap = existing[0];
        await base44.asServiceRole.entities.ContentGap.update(existingGap.id, {
          frequency: existingGap.frequency + group.frequency,
          query_examples: [
            ...(existingGap.query_examples || []),
            ...sampleQueries
          ].slice(0, 10),
          priority: (existingGap.frequency + group.frequency) >= 5 ? 'high' : 'medium'
        });
        gaps.push(existingGap);
      }
    }

    return Response.json({
      success: true,
      analyzed_events: recentEvents.length,
      problematic_events: problematicEvents.length,
      gaps_identified: gaps.length,
      gaps: gaps.map(g => ({
        id: g.id,
        topic: g.topic,
        frequency: g.frequency,
        priority: g.priority
      }))
    });

  } catch (error) {
    console.error('Gap detection error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});