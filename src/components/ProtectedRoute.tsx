import { Navigate, useLocation } from 'react-router-dom';
import { useRouteAccess } from '../hooks/useAuth';
import { useAuth } from '../stores/authStore';
import type { ProtectedRouteProps } from '../types/auth';

/**
 * Componente de loading mientras se verifica la autenticación
 */
const AuthLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="flex flex-col items-center space-y-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      <p className="text-gray-600">Verificando autenticación...</p>
    </div>
  </div>
);

/**
 * Componente de acceso denegado
 */
const AccessDenied = ({ message }: { message?: string }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6 text-center">
      <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
        <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.854-.833-2.625 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">Acceso Denegado</h3>
      <p className="text-sm text-gray-500 mb-4">
        {message || 'No tienes permisos para acceder a esta página.'}
      </p>
      <button
        onClick={() => window.history.back()}
        className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        Volver
      </button>
    </div>
  </div>
);

/**
 * Componente principal para proteger rutas
 */
export const ProtectedRoute = ({
  children,
  requiredRole,
  fallback,
  redirectTo = '/login',
  requireAllRoles = false
}: ProtectedRouteProps) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  
  const hasAccess = useRouteAccess({
    requiredRole,
    requireAllRoles
  });

  // Mostrar loader mientras se verifica la autenticación
  if (isLoading) {
    return <AuthLoader />;
  }

  // Redirigir al login si no está autenticado
  if (!isAuthenticated) {
    return (
      <Navigate 
        to={redirectTo} 
        state={{ from: location.pathname }} 
        replace 
      />
    );
  }

  // Mostrar acceso denegado si no tiene permisos
  if (!hasAccess) {
    if (fallback) {
      return <>{fallback}</>;
    }
    
    // Generar mensaje descriptivo basado en los requerimientos
    let message = 'No tienes permisos para acceder a esta página.';
    
    if (requiredRole) {
      if (Array.isArray(requiredRole)) {
        const rolesList = requiredRole.join(', ');
        message = requireAllRoles 
          ? `Se requieren todos estos roles: ${rolesList}` 
          : `Se requiere uno de estos roles: ${rolesList}`;
      } else {
        message = `Se requiere rol ${requiredRole} para acceder a esta página.`;
      }
    }
    
    return (
      <AccessDenied message={message} />
    );
  }

  // Renderizar el contenido protegido
  return <>{children}</>;
};

/**
 * Componente específico para proteger por roles
 */
export const RoleGuard = ({
  children,
  roles,
  fallback,
  showFallback = true
}: {
  children: React.ReactNode;
  roles: string | string[];
  fallback?: React.ReactNode;
  showFallback?: boolean;
}) => {
  const { user } = useAuth();
  const rolesArray = Array.isArray(roles) ? roles : [roles];
  
  const hasRequiredRole = user && rolesArray.includes(user.role);

  if (!hasRequiredRole) {
    if (fallback) {
      return <>{fallback}</>;
    }
    
    if (showFallback) {
      return (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                Se requiere rol {rolesArray.join(' o ')} para ver este contenido.
              </p>
            </div>
          </div>
        </div>
      );
    }
    
    return null;
  }

  return <>{children}</>;
};


