import { useAuth } from '../stores/authStore';
import { PermissionGuard } from '../components/ProtectedRoute';
import { Permission } from '../types/auth';

const UserDashboard = () => {
  const { user, logout } = useAuth();

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">Dashboard de Usuario</h1>
        <p className="text-green-100">
          Bienvenido, {user?.name}. Aquí puedes gestionar tu perfil y ver tu información.
        </p>
      </div>

      {/* Información del usuario */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Mi Información
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Nombre</label>
              <div className="mt-1 text-sm text-gray-900">{user?.name}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <div className="mt-1 text-sm text-gray-900">{user?.email}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Rol</label>
              <div className="mt-1">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  user?.role === 'admin' ? 'bg-red-100 text-red-800' :
                  user?.role === 'moderator' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {user?.role}
                </span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Estado</label>
              <div className="mt-1">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  user?.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {user?.isActive ? 'Activo' : 'Inactivo'}
                </span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Último acceso</label>
              <div className="mt-1 text-sm text-gray-900">
                {user?.lastLogin ? new Date(user.lastLogin).toLocaleString('es-ES') : 'Nunca'}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Miembro desde</label>
              <div className="mt-1 text-sm text-gray-900">
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('es-ES') : 'No disponible'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Permisos del usuario */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Mis Permisos
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {user?.permissions.map((permission) => (
              <div key={permission} className="flex items-center space-x-3 bg-blue-50 p-3 rounded-lg">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="text-sm font-medium text-blue-900">
                  {permission}
                </div>
              </div>
            ))}
          </div>
          
          {(!user?.permissions || user.permissions.length === 0) && (
            <div className="text-center py-4">
              <p className="text-gray-500">No tienes permisos específicos asignados.</p>
            </div>
          )}
        </div>
      </div>

      {/* Acciones disponibles */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Acciones Disponibles
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            
            {/* Acción básica para todos los usuarios */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Ver Perfil</h4>
              <p className="text-sm text-gray-500 mb-3">
                Consulta y edita tu información personal.
              </p>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 w-full">
                Editar Perfil
              </button>
            </div>

            {/* Acción solo para usuarios con permiso de lectura */}
            <PermissionGuard permissions={[Permission.READ_USERS]}>
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Ver Usuarios</h4>
                <p className="text-sm text-gray-500 mb-3">
                  Consulta la lista de usuarios del sistema.
                </p>
                <button className="bg-green-600 text-white px-4 py-2 rounded-md text-sm hover:bg-green-700 w-full">
                  Ver Lista
                </button>
              </div>
            </PermissionGuard>

            {/* Acción solo para usuarios con permiso de escritura */}
            <PermissionGuard permissions={[Permission.WRITE_USERS]}>
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Gestionar Usuarios</h4>
                <p className="text-sm text-gray-500 mb-3">
                  Crear y modificar usuarios del sistema.
                </p>
                <button className="bg-purple-600 text-white px-4 py-2 rounded-md text-sm hover:bg-purple-700 w-full">
                  Gestionar
                </button>
              </div>
            </PermissionGuard>

            {/* Acción solo para usuarios con permiso de reportes */}
            <PermissionGuard permissions={[Permission.READ_REPORTS]}>
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Ver Reportes</h4>
                <p className="text-sm text-gray-500 mb-3">
                  Accede a los reportes del sistema.
                </p>
                <button className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm hover:bg-indigo-700 w-full">
                  Ver Reportes
                </button>
              </div>
            </PermissionGuard>

            {/* Acción solo para administradores */}
            <PermissionGuard permissions={[Permission.READ_ADMIN]}>
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Panel Admin</h4>
                <p className="text-sm text-gray-500 mb-3">
                  Accede al panel de administración.
                </p>
                <button className="bg-red-600 text-white px-4 py-2 rounded-md text-sm hover:bg-red-700 w-full">
                  Ir a Admin
                </button>
              </div>
            </PermissionGuard>

            {/* Configuración básica */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Configuración</h4>
              <p className="text-sm text-gray-500 mb-3">
                Personaliza tus preferencias.
              </p>
              <button className="bg-gray-600 text-white px-4 py-2 rounded-md text-sm hover:bg-gray-700 w-full">
                Configurar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Estadísticas personales */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Mis Estadísticas
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {user?.permissions.length || 0}
              </div>
              <div className="text-sm text-gray-500">Permisos asignados</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {user?.isActive ? '100%' : '0%'}
              </div>
              <div className="text-sm text-gray-500">Estado de cuenta</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {Math.floor(Math.random() * 30) + 1}
              </div>
              <div className="text-sm text-gray-500">Días activo</div>
            </div>
          </div>
        </div>
      </div>

      {/* Cerrar sesión */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Sesión
              </h3>
              <p className="text-sm text-gray-500">
                Gestiona tu sesión actual.
              </p>
            </div>
            <button
              onClick={logout}
              className="bg-red-600 text-white px-4 py-2 rounded-md text-sm hover:bg-red-700"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;
