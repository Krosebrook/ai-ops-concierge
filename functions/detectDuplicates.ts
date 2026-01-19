import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Fetch all active documents
    const documents = await base44.entities.Document.filter({ status: "active" });

    if (documents.length < 2) {
      return Response.json({
        duplicates: [],
        outdated: []
      });
    }

    // Build document context
    const docContext = documents.map((d, idx) => 
      `[${idx}] ID: ${d.id}
Title: ${d.title}
Created: ${d.created_date}
Version: ${d.version || 1}
Content Summary: ${d.ai_summary || d.content?.substring(0, 300)}
Tags: ${d.tags?.join(", ")}
---`
    ).join("\n\n");

    const prompt = `Analyze these documents for duplicates and outdated content.

DOCUMENTS:
${docContext}

TASK:
1. Find duplicate or highly similar documents (>70% content overlap)
2. Identify potentially outdated documents (old dates, superseded by newer versions)
3. Suggest merging duplicates or archiving outdated content

Return JSON:
{
  "duplicates": [
    {
      "primary_index": number,
      "duplicate_indices": [numbers],
      "similarity": 0.0-1.0,
      "recommendation": "merge or keep separate",
      "reason": "why they are duplicates"
    }
  ],
  "outdated": [
    {
      "index": number,
      "confidence": 0.0-1.0,
      "reason": "why it may be outdated",
      "action": "archive or update"
    }
  ]
}`;

    const analysis = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          duplicates: {
            type: "array",
            items: {
              type: "object",
              properties: {
                primary_index: { type: "number" },
                duplicate_indices: { type: "array", items: { type: "number" } },
                similarity: { type: "number" },
                recommendation: { type: "string" },
                reason: { type: "string" }
              }
            }
          },
          outdated: {
            type: "array",
            items: {
              type: "object",
              properties: {
                index: { type: "number" },
                confidence: { type: "number" },
                reason: { type: "string" },
                action: { type: "string" }
              }
            }
          }
        }
      }
    });

    // Map indices to document IDs
    const enrichedDuplicates = analysis.duplicates.map(dup => ({
      primary: {
        id: documents[dup.primary_index].id,
        title: documents[dup.primary_index].title
      },
      duplicates: dup.duplicate_indices.map(idx => ({
        id: documents[idx].id,
        title: documents[idx].title
      })),
      similarity: dup.similarity,
      recommendation: dup.recommendation,
      reason: dup.reason
    }));

    const enrichedOutdated = analysis.outdated.map(out => ({
      document: {
        id: documents[out.index].id,
        title: documents[out.index].title,
        created_date: documents[out.index].created_date
      },
      confidence: out.confidence,
      reason: out.reason,
      action: out.action
    }));

    return Response.json({
      duplicates: enrichedDuplicates,
      outdated: enrichedOutdated,
      total_analyzed: documents.length
    });

  } catch (error) {
    console.error("Duplicate detection error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});