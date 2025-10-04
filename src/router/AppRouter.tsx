import { createBrowserRouter } from "react-router-dom";
import Test from "../Test";
import DashboardLayout from "../components/Layout";
import App from "../App";
import Login from "../pages/Login";
import AdminPanel from "../pages/AdminPanel";
import UserProfile from "../pages/UserProfile";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { UserRole } from "../types/auth";
import { Building } from "../pages/Building";
import { BuildingDetail } from "@/pages/BuildingDetail";
import { BuildingEdit } from "@/pages/BuildingEdit";
import { Branch } from "@/pages/Branch";
import { BranchDetail } from "@/pages/BranchDetail";
import { BranchEdit } from "@/pages/BranchEdit";
import { Orders } from "@/pages/Orders";
import { OrderDetail } from "@/pages/OrderDetail";
import { OrderEdit } from "@/pages/OrderEdit";
import { Customers } from "@/pages/Customers";
import { CustomerDetail } from "@/pages/CustomerDetail";
import { CustomerEdit } from "@/pages/CustomerEdit";

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
        path: "building",
        element: (
          <ProtectedRoute requiredRole={[UserRole.ADMIN, UserRole.OPERATOR]}>
            <Building />
          </ProtectedRoute>
        ),
      },
      {
        path: "building/:id",
        element: (
          <ProtectedRoute requiredRole={[UserRole.ADMIN, UserRole.OPERATOR]}>
            <BuildingDetail />
          </ProtectedRoute>
        ),
      },
      {
        path: "building/:id/edit",
        element: (
          <ProtectedRoute requiredRole={[UserRole.ADMIN, UserRole.OPERATOR]}>
            <BuildingEdit />
          </ProtectedRoute>
        ),
      },
      {
        path: "branch",
        element: (
          <ProtectedRoute requiredRole={[UserRole.ADMIN, UserRole.OPERATOR]}>
            <Branch />
          </ProtectedRoute>
        ),
      },
      {
        path: "branch/:id",
        element: (
          <ProtectedRoute requiredRole={[UserRole.ADMIN, UserRole.OPERATOR]}>
            <BranchDetail />
          </ProtectedRoute>
        ),
      },
      {
        path: "branch/:id/edit",
        element: (
          <ProtectedRoute requiredRole={[UserRole.ADMIN, UserRole.OPERATOR]}>
            <BranchEdit />
          </ProtectedRoute>
        ),
      },
      {
        path: "orders",
        element: (
          <ProtectedRoute requiredRole={[UserRole.ADMIN, UserRole.OPERATOR]}>
            <Orders />
          </ProtectedRoute>
        ),
      },
      {
        path: "orders/:id",
        element: (
          <ProtectedRoute requiredRole={[UserRole.ADMIN, UserRole.OPERATOR]}>
            <OrderDetail />
          </ProtectedRoute>
        ),
      },
      {
        path: "orders/:id/edit",
        element: (
          <ProtectedRoute requiredRole={[UserRole.ADMIN, UserRole.OPERATOR]}>
            <OrderEdit />
          </ProtectedRoute>
        ),
      },
      {
        path: "customers",
        element: (
          <ProtectedRoute requiredRole={[UserRole.ADMIN, UserRole.OPERATOR]}>
            <Customers />
          </ProtectedRoute>
        ),
      },
      {
        path: "customers/:id",
        element: (
          <ProtectedRoute requiredRole={[UserRole.ADMIN, UserRole.OPERATOR]}>
            <CustomerDetail />
          </ProtectedRoute>
        ),
      },
      {
        path: "customers/:id/edit",
        element: (
          <ProtectedRoute requiredRole={[UserRole.ADMIN, UserRole.OPERATOR]}>
            <CustomerEdit />
          </ProtectedRoute>
        ),
      },
    ],
  },
]);
