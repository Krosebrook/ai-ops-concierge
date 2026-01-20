import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { sourceId } = await req.json();

    if (!sourceId) {
      return Response.json({ error: 'sourceId required' }, { status: 400 });
    }

    // Get external source configuration
    const sources = await base44.asServiceRole.entities.ExternalSource.filter({ id: sourceId });
    
    if (sources.length === 0) {
      return Response.json({ error: 'Source not found' }, { status: 404 });
    }

    const source = sources[0];

    // Fetch content from external URL
    let content = '';
    let title = source.name;

    try {
      if (source.type === 'api') {
        // API-based source
        const headers = source.sync_config?.headers || {};
        const response = await fetch(source.url, { headers });
        const data = await response.json();
        content = JSON.stringify(data, null, 2);
        title = `${source.name} - API Data`;
      } else {
        // Web-based source (documentation, article, etc.)
        const response = await fetch(source.url);
        const html = await response.text();
        
        // Extract text content (simple extraction)
        const textMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
        if (textMatch) {
          content = textMatch[1]
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .substring(0, 10000); // Limit to 10k chars
        }
      }
    } catch (error) {
      await base44.asServiceRole.entities.ExternalSource.update(sourceId, {
        status: 'error',
        last_synced_at: new Date().toISOString()
      });
      return Response.json({ 
        error: 'Failed to fetch external content',
        details: error.message 
      }, { status: 500 });
    }

    if (!content) {
      return Response.json({ error: 'No content extracted' }, { status: 400 });
    }

    // Use AI to summarize the content
    const summaryResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Summarize this external documentation/article in 2-3 concise sentences. Focus on key information that would be useful for customer support or operations.

Source: ${source.name}
Type: ${source.type}
URL: ${source.url}

Content:
${content.substring(0, 5000)}

Provide a clear, informative summary.`,
    });

    // Create or update document
    const existingDocs = await base44.asServiceRole.entities.Document.filter({
      external_url: source.url
    });

    const docData = {
      title: `${source.name} - ${new Date().toLocaleDateString()}`,
      content: content.substring(0, 8000), // Limit content size
      type: 'txt',
      status: 'active',
      is_external: true,
      external_url: source.url,
      external_approved: !source.external_only, // If not external-only, auto-approve
      tags: source.auto_tag ? [source.auto_tag] : [],
      ai_summary: summaryResponse.output,
      summary_generated_at: new Date().toISOString(),
      last_synced_at: new Date().toISOString(),
      owner_id: user.id,
      owner_name: user.full_name,
      version: 1
    };

    let document;
    if (existingDocs.length > 0) {
      // Update existing document
      document = await base44.asServiceRole.entities.Document.update(
        existingDocs[0].id,
        {
          ...docData,
          version: (existingDocs[0].version || 1) + 1
        }
      );
    } else {
      // Create new document
      document = await base44.asServiceRole.entities.Document.create(docData);
    }

    // Update source metadata
    const currentCount = await base44.asServiceRole.entities.Document.filter({
      is_external: true,
      external_url: source.url
    });

    await base44.asServiceRole.entities.ExternalSource.update(sourceId, {
      last_synced_at: new Date().toISOString(),
      status: 'active',
      document_count: currentCount.length
    });

    return Response.json({
      success: true,
      source: source.name,
      document: {
        id: document.id,
        title: document.title,
        summary: document.ai_summary
      },
      synced_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Sync error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});