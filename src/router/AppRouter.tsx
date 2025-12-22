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
import { 
  PricingEngine, 
  PricingEngineCreate, 
  PricingEngineEdit, 
  PricingEngineDetail,
  FloorMultiplier,
  FloorMultiplierCreate,
  FloorMultiplierEdit,
  SizePerm,
  SizePermCreate,
  SizePermEdit
} from "../pages/pricing";
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
        path: "pricing-engine/create",
        element: (
          <ProtectedRoute requiredRole={[UserRole.ADMIN]}>
            <PricingEngineCreate />
          </ProtectedRoute>
        ),
      },
      {
        path: "pricing-engine/:id",
        element: (
          <ProtectedRoute requiredRole={[UserRole.ADMIN]}>
            <PricingEngineDetail />
          </ProtectedRoute>
        ),
      },
      {
        path: "pricing-engine/edit/:id",
        element: (
          <ProtectedRoute requiredRole={[UserRole.ADMIN]}>
            <PricingEngineEdit />
          </ProtectedRoute>
        ),
      },

      // Floor Multiplier Routes
      {
        path: "floor-multiplier",
        element: (
          <ProtectedRoute requiredRole={[UserRole.ADMIN]}>
            <FloorMultiplier />
          </ProtectedRoute>
        ),
      },
      {
        path: "floor-multiplier/create",
        element: (
          <ProtectedRoute requiredRole={[UserRole.ADMIN]}>
            <FloorMultiplierCreate />
          </ProtectedRoute>
        ),
      },
      {
        path: "floor-multiplier/edit/:id",
        element: (
          <ProtectedRoute requiredRole={[UserRole.ADMIN]}>
            <FloorMultiplierEdit />
          </ProtectedRoute>
        ),
      },

      // Size Permission Routes
      {
        path: "size-perm",
        element: (
          <ProtectedRoute requiredRole={[UserRole.ADMIN]}>
            <SizePerm />
          </ProtectedRoute>
        ),
      },
      {
        path: "size-perm/create",
        element: (
          <ProtectedRoute requiredRole={[UserRole.ADMIN]}>
            <SizePermCreate />
          </ProtectedRoute>
        ),
      },
      {
        path: "size-perm/edit/:id",
        element: (
          <ProtectedRoute requiredRole={[UserRole.ADMIN]}>
            <SizePermEdit />
          </ProtectedRoute>
        ),
      },
    ],
  },
]);
