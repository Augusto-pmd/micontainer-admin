import { useMemo } from 'react';
import type { Permission, UserRole } from '../types/auth';
import { ROLE_PERMISSIONS } from '../types/auth';
import { useUser } from '../stores/authStore';

/**
 * Hook para verificar permisos del usuario actual
 */
export const usePermissions = () => {
  const user = useUser();

  return useMemo(() => {
    const userPermissions = user?.permissions || [];

    return {
      // Lista de permisos del usuario
      permissions: userPermissions,
      
      // Verificar si tiene un permiso específico
      hasPermission: (permission: Permission): boolean => {
        return userPermissions.includes(permission);
      },
      
      // Verificar si tiene TODOS los permisos especificados
      hasAllPermissions: (permissions: Permission[]): boolean => {
        return permissions.every(permission => userPermissions.includes(permission));
      },
      
      // Verificar si tiene AL MENOS UNO de los permisos especificados
      hasAnyPermission: (permissions: Permission[]): boolean => {
        return permissions.some(permission => userPermissions.includes(permission));
      },
      
      // Verificar si puede acceder a una ruta específica
      canAccess: (requiredPermissions?: Permission[]): boolean => {
        if (!requiredPermissions || requiredPermissions.length === 0) {
          return true;
        }
        return requiredPermissions.every(permission => userPermissions.includes(permission));
      }
    };
  }, [user]);
};

/**
 * Hook para verificar roles del usuario actual
 */
export const useRole = () => {
  const user = useUser();

  return useMemo(() => {
    const userRole = user?.role;

    // Jerarquía de roles (mayor número = mayor privilegio)
    const roleHierarchy: Record<UserRole, number> = {
      guest: 0,
      user: 1,
      moderator: 2,
      admin: 3
    };

    return {
      // Rol actual del usuario
      role: userRole,
      
      // Verificar si tiene un rol específico
      hasRole: (role: UserRole): boolean => {
        return userRole === role;
      },
      
      // Verificar si tiene ALGUNO de los roles especificados
      hasAnyRole: (roles: UserRole[]): boolean => {
        return roles.some(role => userRole === role);
      },
      
      // Verificar si el rol es igual o superior al especificado
      hasRoleOrHigher: (minimumRole: UserRole): boolean => {
        if (!userRole) return false;
        return roleHierarchy[userRole] >= roleHierarchy[minimumRole];
      },
      
      // Verificar si es admin
      isAdmin: (): boolean => {
        return userRole === 'admin';
      },
      
      // Verificar si es moderador o superior
      isModerator: (): boolean => {
        return userRole === 'moderator' || userRole === 'admin';
      },
      
      // Verificar si puede acceder basado en el rol mínimo requerido
      canAccessByRole: (requiredRole?: UserRole): boolean => {
        if (!requiredRole) return true;
        if (!userRole) return false;
        return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
      }
    };
  }, [user]);
};

/**
 * Hook combinado para verificaciones de acceso
 */
export const useAccess = () => {
  const { hasPermission, hasAllPermissions, hasAnyPermission } = usePermissions();
  const { hasRole, hasRoleOrHigher, isAdmin, isModerator } = useRole();
  const user = useUser();

  return useMemo(() => ({
    // Verificaciones de permisos
    hasPermission,
    hasAllPermissions,
    hasAnyPermission,
    
    // Verificaciones de roles
    hasRole,
    hasRoleOrHigher,
    isAdmin,
    isModerator,
    
    // Verificación combinada de acceso
    canAccess: (options: {
      requiredRole?: UserRole | UserRole[];
      requiredPermissions?: Permission[];
      requireAll?: boolean; // Si true, requiere TODOS los permisos, si false, solo UNO
      requireAllRoles?: boolean; // Si true, requiere TODOS los roles, si false, solo UNO
    }): boolean => {
      const { requiredRole, requiredPermissions, requireAll = true, requireAllRoles = false } = options;
      
      // Si no está autenticado, no puede acceder
      if (!user) return false;
      
      // Verificar rol(es) si es requerido
      if (requiredRole) {
        if (Array.isArray(requiredRole)) {
          // Múltiples roles
          if (requireAllRoles) {
            // Debe tener TODOS los roles (raro, pero posible)
            const hasAllRoles = requiredRole.every(role => hasRoleOrHigher(role));
            if (!hasAllRoles) return false;
          } else {
            // Debe tener AL MENOS UNO de los roles
            const hasAnyRole = requiredRole.some(role => hasRoleOrHigher(role));
            if (!hasAnyRole) return false;
          }
        } else {
          // Rol único
          if (!hasRoleOrHigher(requiredRole)) {
            return false;
          }
        }
      }
      
      // Verificar permisos si son requeridos
      if (requiredPermissions && requiredPermissions.length > 0) {
        if (requireAll) {
          return hasAllPermissions(requiredPermissions);
        } else {
          return hasAnyPermission(requiredPermissions);
        }
      }
      
      return true;
    },
    
    // Obtener permisos por rol
    getPermissionsByRole: (role: UserRole): Permission[] => {
      return ROLE_PERMISSIONS[role] || [];
    }
  }), [user, hasPermission, hasAllPermissions, hasAnyPermission, hasRole, hasRoleOrHigher, isAdmin, isModerator]);
};

/**
 * Hook para verificar si puede acceder a una ruta específica
 */
export const useRouteAccess = (routeConfig: {
  requiredRole?: UserRole | UserRole[];
  requiredPermissions?: Permission[];
  requireAllPermissions?: boolean;
  requireAllRoles?: boolean;
}) => {
  const { canAccess } = useAccess();
  
  return useMemo(() => {
    return canAccess({
      requiredRole: routeConfig.requiredRole,
      requiredPermissions: routeConfig.requiredPermissions,
      requireAll: routeConfig.requireAllPermissions,
      requireAllRoles: routeConfig.requireAllRoles
    });
  }, [canAccess, routeConfig]);
};
