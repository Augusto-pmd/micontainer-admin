import { useMemo } from 'react';
import type { UserRole } from '../types/auth';
import { useUser } from '../stores/authStore';

/**
 * Hook para verificar roles del usuario actual
 */
export const useRole = () => {
  const user = useUser();

  return useMemo(() => {
    const userRole = user?.role;

    // Jerarquía de roles (mayor número = mayor privilegio)
    const roleHierarchy: Record<UserRole, number> = {
      'role-guest': 0,
      'role-user': 1,
      'role-operator': 2,
      'role-admin': 3
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
        return userRole === 'role-admin';
      },
      
      // Verificar si es operador o superior
      isOperator: (): boolean => {
        return userRole === 'role-operator' || userRole === 'role-admin';
      }
    };
  }, [user]);
};

/**
 * Hook para verificar si puede acceder a una ruta específica
 */
export const useRouteAccess = (routeConfig: {
  requiredRole?: UserRole | UserRole[];
  requireAllRoles?: boolean;
}) => {
  const { hasRole, hasAnyRole } = useRole();
  const user = useUser();
  
  return useMemo(() => {
    // Si no está autenticado, no puede acceder
    if (!user) return false;
    
    // Si no hay requerimientos de rol, puede acceder
    if (!routeConfig.requiredRole) return true;
    
    // Verificar rol(es) requerido(s)
    if (Array.isArray(routeConfig.requiredRole)) {
      if (routeConfig.requireAllRoles) {
        // Debe tener TODOS los roles especificados
        return routeConfig.requiredRole.every(role => hasRole(role));
      } else {
        // Debe tener AL MENOS UNO de los roles especificados
        return hasAnyRole(routeConfig.requiredRole);
      }
    } else {
      // Rol único
      return hasRole(routeConfig.requiredRole);
    }
  }, [user, routeConfig, hasRole, hasAnyRole]);
};
