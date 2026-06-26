import { createBrowserRouter } from "react-router-dom";
import DashboardLayout from "../components/Layout";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { Login, UserProfile, ForgotPassword, ResetPassword } from "../pages/auth";
import { Branch, BranchDetail, BranchEdit, BranchCreate } from "../pages/branch";
import { Building, BuildingDetail, BuildingEdit, BuildingMap, BuildingCreate } from "../pages/building";
import { CustomerDetail, CustomerEdit, Customers, CustomerCreate } from "../pages/customer";
import { Operators, OperatorDetail, OperatorCreate } from "../pages/operator";
import { OrderDetail, OrderEdit, Orders, OrderCreate } from "../pages/order";
import { StorageRooms, StorageRoomDetail, StorageRoomCreate, StorageRoomEdit } from "../pages/storageRoom";
import { Dashboard, GlobalMap } from "../pages/dashboard";
import Inventory from "../pages/inventory";
import { PricingEngine } from "../pages/pricing";
import Reservations from "../pages/reservations/Reservations";
import Waitlist from "../pages/waitlist";
import Avisos from "../pages/avisos";
import Tarifas from "../pages/tarifas";
import PromoWeb from "../pages/promo";
import Vender from "../pages/vender";
import Auditoria from "../pages/auditoria";
import Mantenimiento from "../pages/mantenimiento";
import { UserRole } from "../types/auth";

export const router = createBrowserRouter([
  // Rutas públicas de autenticación
  {
    path: "/login",
    Component: Login,
  },
  {
    path: "/forgot-password",
    Component: ForgotPassword,
  },
  {
    path: "/reset-password",
    Component: ResetPassword,
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
            <Dashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: "dashboard",
        element: (
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: "global-map",
        element: (
          <ProtectedRoute>
            <GlobalMap />
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
        path: "building/create",
        element: (
          <ProtectedRoute requiredRole={[UserRole.ADMIN, UserRole.OPERATOR]}>
            <BuildingCreate />
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
        path: "building/:id/map",
        element: (
          <ProtectedRoute requiredRole={[UserRole.ADMIN, UserRole.OPERATOR]}>
            <BuildingMap />
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
        path: "branch/create",
        element: (
          <ProtectedRoute requiredRole={[UserRole.ADMIN, UserRole.OPERATOR]}>
            <BranchCreate />
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
        path: "orders/create",
        element: (
          <ProtectedRoute requiredRole={[UserRole.ADMIN, UserRole.OPERATOR]}>
            <OrderCreate />
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
        path: "customers/create",
        element: (
          <ProtectedRoute requiredRole={[UserRole.ADMIN, UserRole.OPERATOR]}>
            <CustomerCreate />
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
      {
        path: "operators",
        element: (
          <ProtectedRoute requiredRole={[UserRole.ADMIN]}>
            <Operators />
          </ProtectedRoute>
        ),
      },
      {
        path: "operators/create",
        element: (
          <ProtectedRoute requiredRole={[UserRole.ADMIN]}>
            <OperatorCreate />
          </ProtectedRoute>
        ),
      },
      {
        path: "operators/:id",
        element: (
          <ProtectedRoute requiredRole={[UserRole.ADMIN]}>
            <OperatorDetail />
          </ProtectedRoute>
        ),
      },
      {
        path: "storage-rooms",
        element: (
          <ProtectedRoute requiredRole={[UserRole.ADMIN, UserRole.OPERATOR]}>
            <StorageRooms />
          </ProtectedRoute>
        ),
      },
      {
        path: "storage-rooms/create",
        element: (
          <ProtectedRoute requiredRole={[UserRole.ADMIN, UserRole.OPERATOR]}>
            <StorageRoomCreate />
          </ProtectedRoute>
        ),
      },
      {
        path: "storage-rooms/:id",
        element: (
          <ProtectedRoute requiredRole={[UserRole.ADMIN, UserRole.OPERATOR]}>
            <StorageRoomDetail />
          </ProtectedRoute>
        ),
      },
      {
        path: "storage-rooms/:id/edit",
        element: (
          <ProtectedRoute requiredRole={[UserRole.ADMIN, UserRole.OPERATOR]}>
            <StorageRoomEdit />
          </ProtectedRoute>
        ),
      },

      {
        path: "inventory",
        element: (
          <ProtectedRoute requiredRole={[UserRole.ADMIN, UserRole.OPERATOR]}>
            <Inventory />
          </ProtectedRoute>
        ),
      },

      // Reservas online (Mercado Pago)
      {
        path: "reservations",
        element: (
          <ProtectedRoute requiredRole={[UserRole.ADMIN, UserRole.OPERATOR]}>
            <Reservations />
          </ProtectedRoute>
        ),
      },

      // Pricing Engine Routes
      {
        path: "pricing-engine",
        element: (
          <ProtectedRoute requiredRole={[UserRole.ADMIN]}>
            <PricingEngine />
          </ProtectedRoute>
        ),
      },

      {
        path: "waitlist",
        element: (
          <ProtectedRoute requiredRole={[UserRole.ADMIN, UserRole.OPERATOR]}>
            <Waitlist />
          </ProtectedRoute>
        ),
      },
      {
        path: "avisos",
        element: (
          <ProtectedRoute requiredRole={[UserRole.ADMIN, UserRole.OPERATOR]}>
            <Avisos />
          </ProtectedRoute>
        ),
      },
      {
        path: "tarifas",
        element: (
          <ProtectedRoute requiredRole={[UserRole.ADMIN]}>
            <Tarifas />
          </ProtectedRoute>
        ),
      },
      {
        path: "promocion",
        element: (
          <ProtectedRoute requiredRole={[UserRole.ADMIN]}>
            <PromoWeb />
          </ProtectedRoute>
        ),
      },
      {
        path: "vender",
        element: (
          <ProtectedRoute requiredRole={[UserRole.ADMIN, UserRole.OPERATOR]}>
            <Vender />
          </ProtectedRoute>
        ),
      },
      {
        path: "auditoria",
        element: (
          <ProtectedRoute requiredRole={[UserRole.ADMIN]}>
            <Auditoria />
          </ProtectedRoute>
        ),
      },
      {
        path: "mantenimiento",
        element: (
          <ProtectedRoute requiredRole={[UserRole.ADMIN]}>
            <Mantenimiento />
          </ProtectedRoute>
        ),
      },
    ],
  },
]);
