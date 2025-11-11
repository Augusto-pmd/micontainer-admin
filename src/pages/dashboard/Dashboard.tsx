import { Link } from "react-router-dom";
import { MdMap } from "react-icons/md";
import { FaClipboardList, FaUserTie } from "react-icons/fa6";
import { HiUsers } from "react-icons/hi";
import { useAuth } from "@/stores/authStore";
import { UserRole } from "@/types/auth";

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {/* Card para el Mapa Global */}
        <Link
          to="/global-map"
          className="bg-white border-2 border-gray-200 rounded-lg p-6 hover:border-green-500 hover:shadow-lg transition-all duration-200"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="bg-green-100 p-3 rounded-lg">
              <MdMap className="text-3xl text-green-600" />
            </div>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Mapa Global
          </h3>
          <p className="text-gray-600 text-sm">
            Visualiza y gestiona todos los edificios y espacios de almacenamiento
          </p>
        </Link>

        {/* Card para Órdenes */}
        {(user?.role === UserRole.ADMIN || user?.role === UserRole.OPERATOR) && (
          <Link
            to="/orders"
            className="bg-white border-2 border-gray-200 rounded-lg p-6 hover:border-green-500 hover:shadow-lg transition-all duration-200"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="bg-green-100 p-3 rounded-lg">
                <FaClipboardList className="text-3xl text-green-600" />
              </div>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Órdenes
            </h3>
            <p className="text-gray-600 text-sm">
              Gestiona y visualiza todas las órdenes de servicio
            </p>
          </Link>
        )}

        {/* Card para Clientes */}
        {(user?.role === UserRole.ADMIN || user?.role === UserRole.OPERATOR) && (
          <Link
            to="/customers"
            className="bg-white border-2 border-gray-200 rounded-lg p-6 hover:border-green-500 hover:shadow-lg transition-all duration-200"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="bg-green-100 p-3 rounded-lg">
                <HiUsers className="text-3xl text-green-600" />
              </div>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Clientes
            </h3>
            <p className="text-gray-600 text-sm">
              Administra la información de todos tus clientes
            </p>
          </Link>
        )}

        {/* Card para Operadores */}
        {user?.role === UserRole.ADMIN && (
          <Link
            to="/operators"
            className="bg-white border-2 border-gray-200 rounded-lg p-6 hover:border-green-500 hover:shadow-lg transition-all duration-200"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="bg-green-100 p-3 rounded-lg">
                <FaUserTie className="text-3xl text-green-600" />
              </div>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Operadores
            </h3>
            <p className="text-gray-600 text-sm">
              Gestiona los usuarios operadores del sistema
            </p>
          </Link>
        )}
      </div>
    </div>
  );
}
