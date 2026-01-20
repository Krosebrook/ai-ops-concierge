import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { documentIds, action } = await req.json();

    if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
      return Response.json({ error: 'Document IDs required' }, { status: 400 });
    }

    const results = {
      success: [],
      failed: []
    };

    for (const docId of documentIds) {
      try {
        const docs = await base44.entities.Document.filter({ id: docId });
        const doc = docs[0];

        if (!doc) {
          results.failed.push({ id: docId, reason: 'Document not found' });
          continue;
        }

        if (action === 'archive') {
          await base44.entities.Document.update(docId, { status: 'archived' });
          results.success.push({ id: docId, action: 'archived' });
        } else if (action === 'draft_update') {
          // AI drafts new version based on outdated content
          const prompt = `This document may be outdated. Draft an updated version.

CURRENT DOCUMENT:
Title: ${doc.title}
Content: ${doc.content}

TASK:
1. Identify what information might be outdated
2. Suggest updated content while maintaining structure
3. Flag areas needing manual review

Return JSON with suggested updates.`;

          const aiResponse = await base44.integrations.Core.InvokeLLM({
            prompt,
            response_json_schema: {
              type: "object",
              properties: {
                suggested_title: { type: "string" },
                suggested_content: { type: "string" },
                changes_summary: { type: "string" },
                requires_review: {
                  type: "array",
                  items: { type: "string" }
                }
              }
            }
          });

          // Create draft as new document
          const draft = await base44.entities.Document.create({
            title: `[DRAFT] ${aiResponse.suggested_title || doc.title}`,
            content: aiResponse.suggested_content,
            type: doc.type,
            tags: doc.tags,
            status: 'active',
            version: (doc.version || 1) + 1,
            previous_version_id: doc.id,
            owner_id: user.id,
            owner_name: user.full_name,
            ai_summary: `AI-generated draft update. Changes: ${aiResponse.changes_summary}`
          });

          results.success.push({ 
            id: docId, 
            action: 'draft_created', 
            draft_id: draft.id,
            changes: aiResponse.changes_summary
          });
        }
      } catch (error) {
        results.failed.push({ id: docId, reason: error.message });
      }
    }

    return Response.json({
      results,
      total: documentIds.length,
      successful: results.success.length,
      failed: results.failed.length
    });

  } catch (error) {
    console.error("Batch processing error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});