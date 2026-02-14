/**
 * Permission utilities for role-based access control
 */

export const PERMISSIONS = {
  // Ask Mode
  ASK_MODE: 'ask_mode',
  
  // Draft Mode
  DRAFT_MODE: 'draft_mode',
  
  // Knowledge Base
  VIEW_KNOWLEDGE_BASE: 'view_knowledge_base',
  UPLOAD_DOCUMENTS: 'upload_documents',
  PUBLISH_DOCUMENTS: 'publish_documents',
  SUGGEST_EDITS: 'suggest_edits',
  CREATE_QA: 'create_qa',
  APPROVE_QA: 'approve_qa',
  MANAGE_TAGS: 'manage_tags',
  
  // AI & Content
  REVIEW_AI_SUGGESTIONS: 'review_ai_suggestions',
  MANAGE_CONTENT_GAPS: 'manage_content_gaps',
  
  // Audit & Monitoring
  VIEW_AUDIT_LOG: 'view_audit_log',
  VIEW_ANALYTICS: 'view_analytics',
  EXPORT_DATA: 'export_data',
  
  // Tasks
  MANAGE_TASKS: 'manage_tasks',
  CREATE_TASKS: 'create_tasks',
  ASSIGN_TASKS: 'assign_tasks',
  
  // Admin
  MANAGE_USERS: 'manage_users',
  MANAGE_SETTINGS: 'manage_settings',
  MANAGE_ROLES: 'manage_roles',
  MANAGE_AUTOMATION: 'manage_automation',
  
  // Client Portal
  CLIENT_PORTAL_ACCESS: 'client_portal_access',
};

export const DEFAULT_ROLES = {
  admin: {
    name: 'Administrator',
    permissions: ['*'] // All permissions
  },
  user: {
    name: 'Standard User',
    permissions: [
      PERMISSIONS.ASK_MODE,
      PERMISSIONS.DRAFT_MODE,
      PERMISSIONS.VIEW_KNOWLEDGE_BASE,
      PERMISSIONS.SUGGEST_EDITS,
      PERMISSIONS.CREATE_QA,
      PERMISSIONS.CREATE_TASKS,
      PERMISSIONS.VIEW_AUDIT_LOG,
    ]
  },
  contributor: {
    name: 'Contributor',
    permissions: [
      PERMISSIONS.ASK_MODE,
      PERMISSIONS.DRAFT_MODE,
      PERMISSIONS.VIEW_KNOWLEDGE_BASE,
      PERMISSIONS.UPLOAD_DOCUMENTS,
      PERMISSIONS.PUBLISH_DOCUMENTS,
      PERMISSIONS.CREATE_QA,
      PERMISSIONS.APPROVE_QA,
      PERMISSIONS.CREATE_TASKS,
      PERMISSIONS.ASSIGN_TASKS,
      PERMISSIONS.VIEW_AUDIT_LOG,
      PERMISSIONS.VIEW_ANALYTICS,
    ]
  },
  viewer: {
    name: 'Viewer (Read-Only)',
    permissions: [
      PERMISSIONS.ASK_MODE,
      PERMISSIONS.VIEW_KNOWLEDGE_BASE,
      PERMISSIONS.VIEW_AUDIT_LOG,
    ]
  }
};

/**
 * Check if user has a specific permission
 * @param {Object} user - User object from base44.auth.me()
 * @param {Array<Object>} customRoles - List of custom roles
 * @param {string} permission - Permission to check
 * @returns {boolean}
 */
export function hasPermission(user, customRoles, permission) {
  // Admin always has all permissions
  if (user?.role === 'admin') return true;
  
  // Check custom role permissions
  if (user?.custom_role_id && customRoles) {
    const userRole = customRoles.find(r => r.id === user.custom_role_id);
    if (userRole) {
      return userRole.permissions?.includes('*') || 
             userRole.permissions?.includes(permission);
    }
  }
  
  // Check direct user permissions (fallback)
  if (user?.permissions) {
    return user.permissions.includes('*') || 
           user.permissions.includes(permission);
  }
  
  // Check default role permissions
  const defaultRole = DEFAULT_ROLES[user?.role];
  if (defaultRole) {
    return defaultRole.permissions.includes('*') || 
           defaultRole.permissions.includes(permission);
  }
  
  return false;
}

/**
 * Check if user has any of the specified permissions
 * @param {Object} user
 * @param {Array<Object>} customRoles
 * @param {Array<string>} permissions
 * @returns {boolean}
 */
export function hasAnyPermission(user, customRoles, permissions) {
  return permissions.some(p => hasPermission(user, customRoles, p));
}

/**
 * Check if user has all of the specified permissions
 * @param {Object} user
 * @param {Array<Object>} customRoles
 * @param {Array<string>} permissions
 * @returns {boolean}
 */
export function hasAllPermissions(user, customRoles, permissions) {
  return permissions.every(p => hasPermission(user, customRoles, p));
}

/**
 * Get all permissions for a user
 * @param {Object} user
 * @param {Array<Object>} customRoles
 * @returns {Array<string>}
 */
export function getUserPermissions(user, customRoles) {
  if (user?.role === 'admin') return Object.values(PERMISSIONS);
  
  if (user?.custom_role_id && customRoles) {
    const userRole = customRoles.find(r => r.id === user.custom_role_id);
    if (userRole?.permissions?.includes('*')) {
      return Object.values(PERMISSIONS);
    }
    if (userRole) {
      return userRole.permissions || [];
    }
  }
  
  if (user?.permissions?.includes('*')) {
    return Object.values(PERMISSIONS);
  }
  
  if (user?.permissions) {
    return user.permissions;
  }
  
  const defaultRole = DEFAULT_ROLES[user?.role];
  return defaultRole?.permissions || [];
}