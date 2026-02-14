import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { hasPermission } from "@/utils/permissions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Lock } from "lucide-react";

/**
 * Component-level permission guard
 * Hides children if user lacks permission
 */
export default function PermissionGuard({ 
  permission, 
  fallback = null,
  showLocked = false,
  children 
}) {
  const [user, setUser] = useState(null);
  const [customRoles, setCustomRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        const roles = await base44.entities.CustomRole.list();
        setCustomRoles(roles);
      } catch (error) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return null;

  const allowed = hasPermission(user, customRoles, permission);
  
  if (!allowed) {
    if (showLocked) {
      return (
        <div className="relative">
          <div className="pointer-events-none opacity-50 blur-sm">
            {children}
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Alert className="max-w-md">
              <Lock className="w-4 h-4" />
              <AlertDescription>
                You don't have permission to access this feature.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      );
    }
    return fallback;
  }

  return children;
}

/**
 * Hook for permission checking
 */
export function usePermissions() {
  const [user, setUser] = useState(null);
  const [customRoles, setCustomRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        const roles = await base44.entities.CustomRole.list();
        setCustomRoles(roles);
      } catch (error) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const checkPermission = (permission) => {
    return hasPermission(user, customRoles, permission);
  };

  return {
    user,
    customRoles,
    loading,
    hasPermission: checkPermission,
    isAdmin: user?.role === 'admin'
  };
}