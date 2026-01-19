import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { query } = await req.json();

    if (!query?.trim()) {
      return Response.json({ error: 'Query is required' }, { status: 400 });
    }

    // Fetch knowledge base content
    const [documents, qas] = await Promise.all([
      base44.entities.Document.filter({ status: "active" }),
      base44.entities.CuratedQA.filter({ status: "approved" })
    ]);

    // Build knowledge context
    const knowledgeItems = [
      ...documents.map(d => ({
        type: "document",
        id: d.id,
        title: d.title,
        content: d.content || d.ai_summary || "",
        tags: d.tags || [],
        owner_name: d.owner_name,
        created_date: d.created_date
      })),
      ...qas.map(qa => ({
        type: "qa",
        id: qa.id,
        title: qa.question,
        content: qa.answer,
        tags: qa.tags || [],
        owner_name: qa.owner_name,
        created_date: qa.created_date
      }))
    ];

    if (knowledgeItems.length === 0) {
      return Response.json({
        intent: "No knowledge base content available",
        results: []
      });
    }

    // Build context string
    const contextString = knowledgeItems.map((item, idx) => 
      `[${idx}] ${item.type === "document" ? "DOCUMENT" : "Q&A"}: ${item.title}
Content: ${item.content.substring(0, 600)}
Tags: ${item.tags.join(", ") || "None"}
---`
    ).join("\n\n");

    const prompt = `You are an advanced semantic search engine for a knowledge base. Your task is to analyze the user's natural language query and find the most relevant content.

USER QUERY: "${query}"

KNOWLEDGE BASE CONTENT:
${contextString}

INSTRUCTIONS:
1. Understand the user's true intent and information need
2. Find items semantically related to the query (not just keyword matches)
3. Rank by semantic relevance (1.0 = perfect match, 0.0 = irrelevant)
4. Extract the most relevant excerpt (max 250 characters)
5. Explain why each result is relevant
6. Return top 6 results with confidence scores above 0.3

Consider:
- Synonyms and related concepts
- Context and domain knowledge
- User intent (what they're trying to accomplish)
- Partial matches with high relevance

Output ONLY valid JSON with this structure:
{
  "intent": "Brief description of what user is looking for",
  "results": [
    {
      "index": number,
      "confidence": 0.0-1.0,
      "highlight": "Most relevant excerpt",
      "reason": "Why this matches the query"
    }
  ]
}`;

    const llmResponse = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          intent: { type: "string" },
          results: {
            type: "array",
            items: {
              type: "object",
              properties: {
                index: { type: "number" },
                confidence: { type: "number" },
                highlight: { type: "string" },
                reason: { type: "string" }
              },
              required: ["index", "confidence", "highlight", "reason"]
            }
          }
        },
        required: ["intent", "results"]
      }
    });

    // Map results back to original items with enrichment
    const enrichedResults = llmResponse.results
      .filter(r => r.index >= 0 && r.index < knowledgeItems.length)
      .map(r => ({
        ...knowledgeItems[r.index],
        confidence: Math.min(1.0, Math.max(0.0, r.confidence)),
        highlight: r.highlight,
        reason: r.reason
      }))
      .sort((a, b) => b.confidence - a.confidence);

    return Response.json({
      intent: llmResponse.intent,
      results: enrichedResults,
      total_searched: knowledgeItems.length
    });

  } catch (error) {
    console.error("Semantic search error:", error);
    return Response.json({ 
      error: "Search failed",
      details: error.message 
    }, { status: 500 });
  }
});