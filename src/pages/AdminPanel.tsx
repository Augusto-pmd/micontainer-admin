import { useState, useEffect } from 'react';

import { useAuth } from '../stores/authStore';
import { UserRole, type User } from '../types/auth';
import { getUsers, updateUserRole } from '../services/user.services';

const AdminPanel = () => {
  const { user, logout } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const userData = await getUsers();
      setUsers(userData);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error al cargar usuarios');
      console.error('Error loading users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleUpdate = async (userId: string, newRole: string) => {
    try {
      await updateUserRole(userId, newRole);
      // Actualizar el usuario en el estado local
      setUsers(users.map(u => 
        u.id === userId ? { ...u, role: newRole as UserRole } : u
      ));
      alert(`Usuario actualizado a rol: ${newRole}`);
    } catch (err: any) {
      console.error('Error updating user role:', err);
      alert('Error al actualizar el rol del usuario');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-lg p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">Panel de Administración</h1>
        <p className="text-red-100">
          Bienvenido, {user?.name}. Tienes acceso completo al sistema.
        </p>
      </div>

      {/* Estadísticas del sistema */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Total Usuarios
                </dt>
                <dd className="text-lg font-medium text-gray-900">
                  {loading ? '...' : users.length}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Usuarios Activos
                </dt>
                <dd className="text-lg font-medium text-gray-900">
                  {loading ? '...' : users.filter(u => u.isActive).length}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Administradores
                </dt>
                <dd className="text-lg font-medium text-gray-900">
                  {loading ? '...' : users.filter(u => u.role === UserRole.ADMIN).length}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Gestión de usuarios - Solo para admins */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Gestión de Usuarios
            </h3>
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Usuario
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rol Actual
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                        Cargando usuarios...
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-red-500">
                        {error}
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                        No hay usuarios disponibles
                      </td>
                    </tr>
                  ) : (
                    users.map((mockUser) => (
                    <tr key={mockUser.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                              {mockUser.avatar}
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {mockUser.name}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {mockUser.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          mockUser.role === UserRole.ADMIN ? 'bg-red-100 text-red-800' :
                          mockUser.role === UserRole.OPERATOR ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {mockUser.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          mockUser.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {mockUser.isActive ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <select
                          className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                          defaultValue={mockUser.role}
                          onChange={(e) => handleRoleUpdate(mockUser.id, e.target.value)}
                        >
                          <option value={UserRole.ADMIN}>Admin</option>
                          <option value={UserRole.OPERATOR}>Operador</option>
                          <option value={UserRole.USER}>Usuario</option>
                          <option value={UserRole.GUEST}>Invitado</option>
                        </select>
                      </td>
                    </tr>
                  ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      {/* Configuración del sistema */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Configuración del Sistema
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Configuración de Seguridad</h4>
              <p className="text-sm text-gray-500 mb-3">
                Gestiona las políticas de seguridad y autenticación.
              </p>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700">
                Configurar
              </button>
            </div>
            
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Logs del Sistema</h4>
              <p className="text-sm text-gray-500 mb-3">
                Revisa los logs de actividad y errores del sistema.
              </p>
              <button className="bg-green-600 text-white px-4 py-2 rounded-md text-sm hover:bg-green-700">
                Ver Logs
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Acciones de administración */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Acciones de Administración
          </h3>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={logout}
              className="bg-red-600 text-white px-4 py-2 rounded-md text-sm hover:bg-red-700"
            >
              Cerrar Sesión
            </button>
            <button className="bg-yellow-600 text-white px-4 py-2 rounded-md text-sm hover:bg-yellow-700">
              Respaldar Sistema
            </button>
            <button className="bg-purple-600 text-white px-4 py-2 rounded-md text-sm hover:bg-purple-700">
              Generar Reportes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
