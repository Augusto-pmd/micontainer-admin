import { createBrowserRouter } from "react-router-dom";
import Test from "../Test";
import DashboardLayout from "../components/Layout";
import App from "../App";
import Login from "../pages/Login";
import AdminPanel from "../pages/AdminPanel";
import UserProfile from "../pages/UserProfile";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { UserRole } from "../types/auth";

export const router = createBrowserRouter([
  // Ruta pública de login
  {
    path: "/login",
    Component: Login,
  },
  // Rutas protegidas con layout
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: (
          <ProtectedRoute>
            <App />
          </ProtectedRoute>
        ),
      },
      {
        path: "dashboard",
        element: (
          <ProtectedRoute>
            <div className="p-6">
              <h1 className="text-2xl font-bold">Dashboard de Usuario</h1>
              <p>Página en construcción</p>
            </div>
          </ProtectedRoute>
        ),
      },
      {
        path: "admin",
        element: (
          <ProtectedRoute
            requiredRole={UserRole.ADMIN}
            fallback={
              <div className="text-center py-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Acceso Denegado
                </h2>
                <p className="text-gray-600">
                  Se requiere rol de administrador para acceder a esta sección.
                </p>
              </div>
            }
          >
            <AdminPanel />
          </ProtectedRoute>
        ),
      },
      {
        path: "profile",
        element: (
          <ProtectedRoute
            requiredRole={[UserRole.ADMIN, UserRole.OPERATOR, UserRole.USER]}
            fallback={
              <div className="text-center py-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Acceso Requerido
                </h2>
                <p className="text-gray-600">
                  Debes iniciar sesión para ver tu perfil.
                </p>
              </div>
            }
          >
            <UserProfile />
          </ProtectedRoute>
        ),
      },
      {
        path: "users",
        element: (
          <ProtectedRoute
            requiredRole={[UserRole.ADMIN, UserRole.OPERATOR, UserRole.USER]}
            fallback={
              <div className="text-center py-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Permisos Insuficientes
                </h2>
                <p className="text-gray-600">
                  No tienes permisos para ver la lista de usuarios.
                </p>
              </div>
            }
          >
            <div className="p-6">
              <h1 className="text-2xl font-bold mb-4">Gestión de Usuarios</h1>
              <p className="text-gray-600">
                Esta sección requiere permisos de lectura de usuarios.
              </p>
            </div>
          </ProtectedRoute>
        ),
      },
      {
        path: "reports",
        element: (
          <ProtectedRoute
            requiredRole={[UserRole.ADMIN, UserRole.OPERATOR]}
            fallback={
              <div className="text-center py-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Sin Acceso a Reportes
                </h2>
                <p className="text-gray-600">
                  No tienes permisos para ver los reportes del sistema.
                </p>
              </div>
            }
          >
            <div className="p-6">
              <h1 className="text-2xl font-bold mb-4">Reportes del Sistema</h1>
              <p className="text-gray-600">
                Esta sección requiere permisos de lectura de reportes.
              </p>
            </div>
          </ProtectedRoute>
        ),
      },
      {
        path: "moderator",
        element: (
          <ProtectedRoute
            requiredRole={UserRole.OPERATOR}
            fallback={
              <div className="text-center py-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Área de Moderadores
                </h2>
                <p className="text-gray-600">
                  Se requiere rol de moderador o superior para acceder.
                </p>
              </div>
            }
          >
            <div className="p-6">
              <h1 className="text-2xl font-bold mb-4">Panel de Moderador</h1>
              <p className="text-gray-600">
                Bienvenido al área de moderadores.
              </p>
            </div>
          </ProtectedRoute>
        ),
      },
      {
        path: "admin-or-mod",
        element: (
          <ProtectedRoute 
            requiredRole={[UserRole.ADMIN, UserRole.OPERATOR]}
            fallback={
              <div className="text-center py-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Acceso Restringido</h2>
                <p className="text-gray-600">
                  Se requiere ser administrador o moderador para acceder.
                </p>
              </div>
            }
          >
            <div className="p-6">
              <h1 className="text-2xl font-bold mb-4">Área Admin/Moderador</h1>
              <p className="text-gray-600">
                Esta sección está disponible tanto para administradores como para moderadores.
              </p>
              <div className="mt-4 p-4 bg-green-50 rounded-lg">
                <h3 className="font-semibold text-green-900">Ejemplo de uso:</h3>
                <code className="text-sm text-green-800">
                  requiredRole={[UserRole.ADMIN, UserRole.OPERATOR]}
                </code>
              </div>
            </div>
          </ProtectedRoute>
        )
      },
      {
        path: "all-users",
        element: (
          <ProtectedRoute 
            requiredRole={[UserRole.ADMIN, UserRole.OPERATOR, UserRole.USER]}
            fallback={
              <div className="text-center py-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Solo para Usuarios Registrados</h2>
                <p className="text-gray-600">
                  Se requiere ser usuario registrado (no invitado).
                </p>
              </div>
            }
          >
            <div className="p-6">
              <h1 className="text-2xl font-bold mb-4">Área para Todos los Usuarios</h1>
              <p className="text-gray-600">
                Esta sección está disponible para todos los usuarios registrados (Admin, Moderador, Usuario).
              </p>
              <div className="mt-4 p-4 bg-green-50 rounded-lg">
                <h3 className="font-semibold text-green-900">Ejemplo de uso:</h3>
                <code className="text-sm text-green-800">
                  requiredRole={[UserRole.ADMIN, UserRole.OPERATOR, UserRole.USER]}
                </code>
              </div>
            </div>
          </ProtectedRoute>
        )
      },
      {
        path: "test",
        element: (
          <ProtectedRoute requiredRole={[UserRole.ADMIN, UserRole.OPERATOR]}>
            <Test />
          </ProtectedRoute>
        ),
      },
    ],
  },
]);
