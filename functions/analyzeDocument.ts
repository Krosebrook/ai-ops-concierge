import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { documentId, analysisType } = await req.json();

    if (!documentId) {
      return Response.json({ error: 'Document ID required' }, { status: 400 });
    }

    const documents = await base44.entities.Document.filter({ id: documentId });
    const document = documents[0];

    if (!document) {
      return Response.json({ error: 'Document not found' }, { status: 404 });
    }

    if (analysisType === 'auto_tag') {
      // Auto-generate tags based on content
      const tagResponse = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze this document and suggest appropriate tags from: Support, Ops, Sales, Compliance.

Title: ${document.title}
Content: ${document.content?.substring(0, 1000)}

Select 1-3 most relevant tags. Return ONLY a JSON array of tags.
Example: ["Support", "Compliance"]`,
        response_json_schema: {
          type: "object",
          properties: {
            tags: {
              type: "array",
              items: { type: "string" }
            }
          }
        }
      });

      return Response.json({
        suggested_tags: tagResponse.tags || []
      });
    }

    return Response.json({ error: 'Invalid analysis type' }, { status: 400 });

  } catch (error) {
    console.error("Document analysis error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});