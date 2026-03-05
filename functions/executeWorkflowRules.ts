import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const { event, data } = payload;
    const entityType = event?.entity_name;
    const entityId = event?.entity_id;
    const entityData = data;

    if (!entityType || !entityId) {
      return Response.json({ error: 'Missing entity info' }, { status: 400 });
    }

    // Load all enabled rules
    const allRules = await base44.asServiceRole.entities.WorkflowRule.list();
    const enabledRules = allRules.filter(r => r.enabled);

    const matchedRules = [];

    for (const rule of enabledRules) {
      if (shouldTrigger(rule, entityType, entityData)) {
        matchedRules.push(rule);
      }
    }

    if (matchedRules.length === 0) {
      return Response.json({ triggered: 0, message: 'No matching rules' });
    }

    const createdTasks = [];

    for (const rule of matchedRules) {
      const taskTitle = renderTemplate(
        rule.action_config?.task_title_template || 'Auto: {trigger_value}',
        { rule, entityData, entityType }
      );
      const taskDescription = renderTemplate(
        rule.action_config?.task_description_template || buildDefaultDescription(rule, entityType, entityData),
        { rule, entityData, entityType }
      );

      const task = await base44.asServiceRole.entities.Task.create({
        title: taskTitle,
        description: taskDescription,
        assigned_team: rule.action_config?.assigned_team || '',
        status: 'open',
        priority: rule.action_config?.task_priority || 'medium',
        is_automated: true,
        workflow_rule_id: rule.id,
        source_entity_type: entityType,
        source_entity_id: entityId,
        event_id: entityType === 'AIEvent' ? entityId : undefined,
      });

      createdTasks.push(task);

      // Send in-app notification
      try {
        await base44.asServiceRole.entities.Notification.create({
          recipient_email: '', // broadcast — front-end polls by role/team
          type: 'support_update',
          title: `Automated Task Created: ${taskTitle}`,
          message: `Rule "${rule.name}" triggered. A new ${rule.action_config?.task_priority || 'medium'} priority task has been assigned to ${rule.action_config?.assigned_team || 'your team'}.`,
          reference_id: task.id,
          priority: rule.action_config?.task_priority === 'urgent' ? 'high' : 'normal',
          is_read: false,
        });
      } catch (notifErr) {
        console.error('Notification creation failed:', notifErr.message);
      }

      // Increment execution count
      await base44.asServiceRole.entities.WorkflowRule.update(rule.id, {
        execution_count: (rule.execution_count || 0) + 1,
        last_executed_at: new Date().toISOString(),
      });
    }

    return Response.json({
      triggered: matchedRules.length,
      tasks_created: createdTasks.length,
      task_ids: createdTasks.map(t => t.id),
    });

  } catch (error) {
    console.error('executeWorkflowRules error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function shouldTrigger(rule, entityType, entityData) {
  switch (rule.trigger_type) {
    case 'event_confidence':
      return entityType === 'AIEvent' && entityData?.confidence === rule.trigger_value;

    case 'ai_event_flag':
      return entityType === 'AIEvent' &&
        Array.isArray(entityData?.flags) &&
        entityData.flags.includes(rule.trigger_value);

    case 'content_gap_identified':
      if (entityType !== 'ContentGap') return false;
      if (rule.trigger_value === 'any') return true;
      // Match by priority
      return entityData?.priority === rule.trigger_value;

    case 'support_request_category':
      return entityType === 'SupportRequest' && entityData?.category === rule.trigger_value;

    default:
      return false;
  }
}

function renderTemplate(template, { rule, entityData, entityType }) {
  const vars = {
    '{trigger_value}': rule.trigger_value || '',
    '{topic}': entityData?.topic || entityData?.input || '',
    '{query}': entityData?.input || entityData?.question || '',
    '{frequency}': String(entityData?.frequency || 1),
    '{priority}': entityData?.priority || '',
    '{confidence}': entityData?.confidence || '',
    '{assigned_team}': rule.action_config?.assigned_team || '',
  };

  let result = template;
  for (const [key, val] of Object.entries(vars)) {
    result = result.replaceAll(key, val);
  }
  return result.slice(0, 200);
}

function buildDefaultDescription(rule, entityType, entityData) {
  if (entityType === 'ContentGap') {
    return `Content gap detected: "${entityData?.topic || 'Unknown topic'}". ` +
      `Frequency: ${entityData?.frequency || 1} occurrence(s). ` +
      `Priority: ${entityData?.priority || 'medium'}. ` +
      `Please create appropriate documentation to address this gap.`;
  }
  if (entityType === 'AIEvent') {
    return `Automated task from AI event. ` +
      `Query: "${(entityData?.input || '').slice(0, 100)}". ` +
      `Confidence: ${entityData?.confidence || 'unknown'}. ` +
      `Triggered by rule: ${rule.name}.`;
  }
  return `Automated task triggered by rule: ${rule.name}`;
}