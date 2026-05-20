import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../stores/authStore";
import { UserRole } from "../types/auth";
import { useState } from "react";
import { FaClipboardList, FaUserTie } from "react-icons/fa6";
import { MdDashboard, MdWarehouse } from "react-icons/md";
import { HiOfficeBuilding, HiUsers, HiUserCircle } from "react-icons/hi";
import { BsBuilding, BsGrid } from "react-icons/bs";
import { FaChartLine, FaLayerGroup } from "react-icons/fa";
import { IoMdSettings } from "react-icons/io";
import MiContainerLogo from "../assets/img/MiContainerLogo.png";

interface LinkItem {
  name: string;
  href?: string;
  icon: string;
  roles?: UserRole[];
  children?: LinkItem[];
}

const links: LinkItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: "dashboard" },
  { name: "Mi Perfil", href: "/profile", icon: "profile" },
  {
    name: "Sucursales",
    href: "/branch",
    icon: "branch",
    roles: [UserRole.ADMIN],
    children: [
      {
        name: "Edificios",
        href: "/building",
        icon: "building",
        roles: [UserRole.ADMIN, UserRole.OPERATOR],
        children: [
          {
            name: "Espacios",
            href: "/storage-rooms",
            icon: "storage",
            roles: [UserRole.ADMIN, UserRole.OPERATOR],
          },
        ],
      },
    ],
  },
  {
    name: "Inventario",
    href: "/inventory",
    icon: "inventory",
    roles: [UserRole.ADMIN, UserRole.OPERATOR],
  },
  {
    name: "Órdenes",
    href: "/orders",
    icon: "orders",
    roles: [UserRole.ADMIN, UserRole.OPERATOR],
  },
  {
    name: "Clientes",
    href: "/customers",
    icon: "customers",
    roles: [UserRole.ADMIN, UserRole.OPERATOR],
  },
  {
    name: "Operadores",
    href: "/operators",
    icon: "operators",
    roles: [UserRole.ADMIN],
  },
  {
    name: "Precios",
    href: "/pricing-engine",
    icon: "pricing",
    roles: [UserRole.ADMIN],
  },
];

// Componente para renderizar items del menú con soporte para submenús
function MenuItem({
  link,
  userRole,
  level = 0,
  onLinkClick,
}: {
  link: LinkItem;
  userRole?: UserRole;
  level?: number;
  onLinkClick?: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  // Verificar permisos
  if (link.roles && link.roles.length > 0) {
    if (!userRole || !link.roles.includes(userRole as UserRole)) {
      return null;
    }
  }

  const hasChildren = link.children && link.children.length > 0;
  const paddingLeft = `${level * 1}rem`;

  // Función para renderizar el icono
  const renderIcon = (icon: string) => {
    switch (icon) {
      case "dashboard":
        return <MdDashboard className="text-xl text-green-600" />;
      case "profile":
        return <HiUserCircle className="text-xl text-green-600" />;
      case "branch":
        return <HiOfficeBuilding className="text-xl text-green-600" />;
      case "building":
        return <BsBuilding className="text-xl text-green-600" />;
      case "inventory":
        return <BsGrid className="text-xl text-green-600" />;
      case "storage":
        return <MdWarehouse className="text-xl text-green-600" />;
      case "orders":
        return <FaClipboardList className="text-xl text-green-600" />;
      case "customers":
        return <HiUsers className="text-xl text-green-600" />;
      case "operators":
        return <FaUserTie className="text-xl text-green-600" />;
      case "pricing":
        return <IoMdSettings className="text-xl text-green-600" />;
      case "floor":
        return <FaChartLine className="text-xl text-green-600" />;
      case "sizeperm":
        return <FaLayerGroup className="text-xl text-green-600" />;
      default:
        return <span>{icon}</span>;
    }
  };

  if (hasChildren) {
    return (
      <li>
        <div className="flex items-center">
          {link.href ? (
            <NavLink
              to={link.href}
              onClick={onLinkClick}
              className={({ isActive }) =>
                `flex-1 text-sm capitalize font-normal rounded-lg flex items-center p-2 transition-colors duration-150 group ${
                  isActive
                    ? 'bg-green-100 text-green-800 font-semibold'
                    : 'text-gray-600 hover:bg-green-50 hover:text-gray-900'
                }`
              }
              style={{ paddingLeft }}
            >
              <span className="mr-3">{renderIcon(link.icon)}</span>
              <span>{link.name}</span>
            </NavLink>
          ) : (
            <div
              className="flex-1 text-base capitalize text-gray-900 font-normal flex items-center p-2"
              style={{ paddingLeft }}
            >
              <span className="mr-3">{renderIcon(link.icon)}</span>
              <span>{link.name}</span>
            </div>
          )}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 hover:bg-green-50 rounded-lg"
          >
            <svg
              className={`w-4 h-4 transition-transform ${
                isOpen ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        </div>
        {isOpen && link.children && (
          <ul className="space-y-1 mt-1">
            {link.children.map((child) => (
              <MenuItem
                key={child.href || child.name}
                link={child}
                userRole={userRole}
                level={level + 1}
                onLinkClick={onLinkClick}
              />
            ))}
          </ul>
        )}
      </li>
    );
  }

  // ID para el tour de onboarding
  const tourId = link.href === '/inventory' ? 'tour-nav-inventory'
    : link.href === '/orders' ? 'tour-nav-orders'
    : undefined;

  return (
    <li id={tourId}>
      <NavLink
        to={link.href!}
        onClick={onLinkClick}
        className={({ isActive }) =>
          `text-sm capitalize font-normal rounded-lg flex items-center p-2 transition-colors duration-150 group ${
            isActive
              ? 'bg-green-100 text-green-800 font-semibold'
              : 'text-gray-600 hover:bg-green-50 hover:text-gray-900'
          }`
        }
        style={{ paddingLeft }}
      >
        <span className="mr-3">{renderIcon(link.icon)}</span>
        <span>{link.name}</span>
      </NavLink>
    </li>
  );
}

export default function DashboardLayout() {
  const { user, logout, isLoading } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-700"></div>
      </div>
    );
  }

  return (
    <>
      <nav className="bg-white border-b border-gray-200 fixed z-30 w-full">
        <div className="px-3 py-3 lg:px-5 lg:pl-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center justify-start">
              <button
                onClick={toggleSidebar}
                aria-expanded={isSidebarOpen}
                aria-controls="sidebar"
                className="lg:hidden mr-2 text-gray-600 hover:text-green-700 cursor-pointer p-2 hover:bg-green-50 focus:bg-green-50 focus:ring-2 focus:ring-green-100 rounded"
              >
                {!isSidebarOpen ? (
                  <svg
                    className="w-6 h-6"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      fillRule="evenodd"
                      d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                      clipRule="evenodd"
                    ></path>
                  </svg>
                ) : (
                  <svg
                    className="w-6 h-6"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    ></path>
                  </svg>
                )}
              </button>
              <Link
                to="/"
                className="text-xl font-bold flex items-center lg:ml-2.5"
              >
                {/* Logo */}
                <img
                  src={MiContainerLogo}
                  alt="Mi Container Logo"
                  className="h-15"
                />
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              {/* Información del usuario */}
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">
                    {user?.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user?.role === UserRole.ADMIN
                          ? "bg-red-100 text-red-800"
                          : user?.role === UserRole.OPERATOR
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-green-100 text-green-800"
                      }`}
                    >
                      {user?.role}
                    </span>
                  </div>
                </div>
                <div className="bg-green-700 text-white p-2 rounded-full w-12 h-12 flex items-center justify-center">
                  {user?.avatar || "U"}
                </div>
                <button
                  onClick={logout}
                  className="text-gray-400 hover:text-green-600 text-sm"
                  title="Cerrar sesión"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>
      <div className="flex overflow-hidden bg-white pt-16">
        <aside
          id="sidebar"
          className={`fixed z-20 h-full top-0 left-0 pt-16 flex-shrink-0 flex-col w-64 transition-transform duration-300 ${
            isSidebarOpen ? "flex translate-x-0" : "-translate-x-full lg:translate-x-0"
          } lg:flex`}
          aria-label="Sidebar"
        >
          <div className="relative flex-1 flex flex-col min-h-0 border-r border-gray-200 bg-white pt-0">
            <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
              <div className="flex-1 px-3 bg-white">
                {/* Enlaces */}
                <ul className="space-y-2">
                  {links.map((link) => (
                    <MenuItem
                      key={link.href || link.name}
                      link={link}
                      userRole={user?.role as UserRole}
                      onLinkClick={() => setIsSidebarOpen(false)}
                    />
                  ))}
                </ul>
              </div>
            </div>
            {/* Botón de cerrar sesión */}
            <div className="px-3 py-4 border-t border-gray-200">
              <button
                onClick={() => {
                  logout();
                  setIsSidebarOpen(false);
                }}
                className="w-full text-base text-gray-900 font-normal rounded-lg flex items-center p-2 hover:bg-red-50 group"
              >
                <svg
                  className="w-5 h-5 mr-3 text-gray-500 group-hover:text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                <span className="group-hover:text-red-600">Cerrar Sesión</span>
              </button>
            </div>
          </div>
        </aside>
        {isSidebarOpen && (
          <div
            className="bg-gray-900 opacity-50 fixed inset-0 z-10 lg:hidden"
            id="sidebarBackdrop"
            onClick={toggleSidebar}
          ></div>
        )}
        <div
          id="main-content"
          className="h-full w-full bg-gray-50 relative overflow-y-auto lg:ml-64"
        >
          <main>
            <div className="pt-6 px-4">
              <div className="w-full min-h-[calc(100vh-230px)]">
                <div className="bg-white shadow rounded-lg p-4 sm:p-6 xl:p-8">
                  <Outlet />
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
