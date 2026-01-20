import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { currentVersionId, previousVersionId } = await req.json();

    if (!currentVersionId || !previousVersionId) {
      return Response.json({ error: 'Both version IDs required' }, { status: 400 });
    }

    const [currentDoc, previousDoc] = await Promise.all([
      base44.entities.Document.filter({ id: currentVersionId }).then(d => d[0]),
      base44.entities.Document.filter({ id: previousVersionId }).then(d => d[0])
    ]);

    if (!currentDoc || !previousDoc) {
      return Response.json({ error: 'Version not found' }, { status: 404 });
    }

    const prompt = `Analyze changes between two document versions and identify important differences.

PREVIOUS VERSION (v${previousDoc.version}):
Title: ${previousDoc.title}
Content: ${previousDoc.content?.substring(0, 1000)}

CURRENT VERSION (v${currentDoc.version}):
Title: ${currentDoc.title}
Content: ${currentDoc.content?.substring(0, 1000)}

TASK:
1. Identify key changes (additions, deletions, modifications)
2. Flag breaking changes (information removed, contradictions, policy changes)
3. Assess impact level (minor, moderate, major)
4. Provide change summary

Return JSON:
{
  "summary": "Brief overview of changes",
  "key_changes": [
    {
      "type": "addition" | "deletion" | "modification",
      "description": "what changed",
      "location": "where in document",
      "impact": "minor" | "moderate" | "major"
    }
  ],
  "breaking_changes": [
    {
      "description": "breaking change description",
      "reason": "why it's breaking"
    }
  ],
  "overall_impact": "minor" | "moderate" | "major",
  "recommendation": "advice for reviewers"
}`;

    const analysis = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          summary: { type: "string" },
          key_changes: {
            type: "array",
            items: {
              type: "object",
              properties: {
                type: { type: "string" },
                description: { type: "string" },
                location: { type: "string" },
                impact: { type: "string" }
              }
            }
          },
          breaking_changes: {
            type: "array",
            items: {
              type: "object",
              properties: {
                description: { type: "string" },
                reason: { type: "string" }
              }
            }
          },
          overall_impact: { type: "string" },
          recommendation: { type: "string" }
        }
      }
    });

    return Response.json({
      ...analysis,
      versions: {
        previous: { id: previousDoc.id, version: previousDoc.version },
        current: { id: currentDoc.id, version: currentDoc.version }
      }
    });

  } catch (error) {
    console.error("Version analysis error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});