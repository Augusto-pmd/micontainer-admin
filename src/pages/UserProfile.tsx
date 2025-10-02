import { useState } from 'react';
import { useAuth } from '../stores/authStore';
import { UserRole } from '../types/auth';
import Button from '../components/Button';

const UserProfile = () => {
  const { user, logout } = useAuth();
  const [isEditing, setIsEditing] = useState(false);

  const getRoleDisplayName = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return 'Administrador';
      case UserRole.OPERATOR:
        return 'Operador';
      case UserRole.USER:
        return 'Usuario';
      case UserRole.GUEST:
        return 'Invitado';
      default:
        return role;
    }
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return 'bg-red-100 text-red-800';
      case UserRole.OPERATOR:
        return 'bg-yellow-100 text-yellow-800';
      case UserRole.USER:
        return 'bg-green-100 text-green-800';
      case UserRole.GUEST:
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-lg p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">Mi Perfil</h1>
        <p className="text-green-100">
          Gestiona tu información personal y configuración de cuenta.
        </p>
      </div>

      {/* Información del usuario */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-6">
            Información Personal
          </h3>
          
          <div className="flex items-center space-x-6 mb-6">
            <div className="flex-shrink-0">
              <div className="h-20 w-20 rounded-full bg-green-700 flex items-center justify-center text-white text-2xl font-bold">
                {user?.avatar || user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
            </div>
            <div>
              <h4 className="text-xl font-semibold text-gray-900">{user?.name}</h4>
              <p className="text-gray-500">{user?.email}</p>
              <span className={`inline-flex mt-2 px-3 py-1 text-sm font-medium rounded-full ${getRoleBadgeColor(user?.role || UserRole.GUEST)}`}>
                {getRoleDisplayName(user?.role || UserRole.GUEST)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre completo
              </label>
              <div className="mt-1 p-3 bg-gray-50 rounded-md text-sm text-gray-900">
                {user?.name || 'No disponible'}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Correo electrónico
              </label>
              <div className="mt-1 p-3 bg-gray-50 rounded-md text-sm text-gray-900">
                {user?.email || 'No disponible'}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Usuario ID
              </label>
              <div className="mt-1 p-3 bg-gray-50 rounded-md text-sm text-gray-900">
                {user?.id || 'No disponible'}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estado de la cuenta
              </label>
              <div className="mt-1">
                <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${
                  user?.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {user?.isActive ? 'Activa' : 'Inactiva'}
                </span>
              </div>
            </div>

            {user?.createdAt && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha de registro
                </label>
                <div className="mt-1 p-3 bg-gray-50 rounded-md text-sm text-gray-900">
                  {new Date(user.createdAt).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>
              </div>
            )}

            {user?.lastLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Último acceso
                </label>
                <div className="mt-1 p-3 bg-gray-50 rounded-md text-sm text-gray-900">
                  {new Date(user.lastLogin).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Configuración de cuenta */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Configuración de Cuenta
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Seguridad</h4>
              <p className="text-sm text-gray-500 mb-3">
                Cambia tu contraseña y configura la autenticación de dos factores.
              </p>
              <Button variant="primary" size="sm">
                Cambiar Contraseña
              </Button>
            </div>
            
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Notificaciones</h4>
              <p className="text-sm text-gray-500 mb-3">
                Configura cómo y cuándo quieres recibir notificaciones.
              </p>
              <button className="bg-green-700 text-white px-4 py-2 rounded-md text-sm hover:bg-green-800">
                Configurar
              </button>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Privacidad</h4>
              <p className="text-sm text-gray-500 mb-3">
                Controla quién puede ver tu información y actividad.
              </p>
              <Button variant="primary" size="sm">
                Configurar
              </Button>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Datos de la cuenta</h4>
              <p className="text-sm text-gray-500 mb-3">
                Descarga o elimina tu información personal.
              </p>
              <Button variant="primary" size="sm">
                Gestionar
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Acciones de cuenta */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Acciones de Cuenta
          </h3>
          <div className="flex flex-wrap gap-4">
            <Button
              onClick={() => setIsEditing(!isEditing)}
              variant="primary"
              size="sm"
            >
              {isEditing ? 'Cancelar Edición' : 'Editar Perfil'}
            </Button>
            <Button
              onClick={logout}
              variant="danger"
              size="sm"
            >
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </div>

      {/* Información adicional si el usuario es admin */}
      {user?.role === UserRole.ADMIN && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Privilegios de Administrador
              </h3>
              <div className="mt-1 text-sm text-yellow-700">
                <p>Tienes acceso completo al sistema. Usa estos privilegios responsablemente.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfile;