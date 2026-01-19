import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { documentId } = await req.json();

    if (!documentId) {
      return Response.json({ error: 'Document ID is required' }, { status: 400 });
    }

    // Fetch the document
    const documents = await base44.entities.Document.filter({ id: documentId });
    const document = documents[0];

    if (!document) {
      return Response.json({ error: 'Document not found' }, { status: 404 });
    }

    // Generate AI summary
    const summaryResponse = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a document summarization expert. Analyze the following document and generate a concise, professional summary (2-3 sentences max) that captures the key points and purpose.

Document Title: ${document.title}
Document Type: ${document.type}
Tags: ${document.tags?.join(", ") || "None"}

Content:
${document.content}

Provide ONLY the summary, no additional commentary.`,
    });

    const summary = summaryResponse.output || "Summary not available";

    // Update the document with the AI summary
    await base44.asServiceRole.entities.Document.update(documentId, {
      ai_summary: summary,
      summary_generated_at: new Date().toISOString(),
    });

    return Response.json({
      success: true,
      summary,
    });
  } catch (error) {
    console.error("Error generating summary:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});