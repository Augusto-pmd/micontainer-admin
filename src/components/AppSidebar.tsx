import { Link, useLocation } from "react-router-dom";
import {
  Home,
  User,
  Building2,
  Store,
  Package,
  ShoppingCart,
  Users,
  UsersRound,
  ChevronUp,
  LogOut,
  DollarSign,
  TrendingUp,
  Layers,
} from "lucide-react";
import { useAuth } from "../stores/authStore";
import { UserRole } from "../types/auth";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface MenuItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: UserRole[];
}

interface MenuGroup {
  label: string;
  items: MenuItem[];
}

const menuGroups: MenuGroup[] = [
  {
    label: "Navegación",
    items: [
      { name: "Dashboard", href: "/dashboard", icon: Home },
      { name: "Mi Perfil", href: "/profile", icon: User },
    ],
  },
  {
    label: "Gestión",
    items: [
      {
        name: "Sucursales",
        href: "/branch",
        icon: Store,
        roles: [UserRole.ADMIN],
      },
      {
        name: "Edificios",
        href: "/building",
        icon: Building2,
        roles: [UserRole.ADMIN, UserRole.OPERATOR],
      },
      {
        name: "Espacios",
        href: "/storage-rooms",
        icon: Package,
        roles: [UserRole.ADMIN, UserRole.OPERATOR],
      },
      {
        name: "Órdenes",
        href: "/orders",
        icon: ShoppingCart,
        roles: [UserRole.ADMIN, UserRole.OPERATOR],
      },
      {
        name: "Clientes",
        href: "/customers",
        icon: Users,
        roles: [UserRole.ADMIN, UserRole.OPERATOR],
      },
      {
        name: "Operadores",
        href: "/operators",
        icon: UsersRound,
        roles: [UserRole.ADMIN],
      },
    ],
  },
  {
    label: "Precios",
    items: [
      {
        name: "Pricing Engine",
        href: "/pricing-engine",
        icon: DollarSign,
        // Temporalmente sin restricción de roles para debug
      },
      {
        name: "Floor Multipliers",
        href: "/floor-multiplier",
        icon: TrendingUp,
        // Temporalmente sin restricción de roles para debug
      },
      {
        name: "Size Permissions",
        href: "/size-perm",
        icon: Layers,
        // Temporalmente sin restricción de roles para debug
      },
    ],
  },
];

export function AppSidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const { state } = useSidebar();

  console.log('🔧 User role:', user?.role);
  console.log('🔧 Total menu groups:', menuGroups.length);

  const filterMenuItems = (items: MenuItem[]) => {
    return items.filter((item) => {
      if (!item.roles || item.roles.length === 0) return true;
      return user?.role && item.roles.includes(user.role as UserRole);
    });
  };

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/" className="flex items-center gap-2">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-green-600 text-white">
                  <Package className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">Mi Container v2</span>
                  <span className="text-xs text-muted-foreground">
                    Admin Panel - UPDATED
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {menuGroups.map((group) => {
          const filteredItems = filterMenuItems(group.items);
          if (filteredItems.length === 0) return null;

          return (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {filteredItems.map((item) => {
                    const isActive = location.pathname === item.href || 
                      location.pathname.startsWith(item.href + "/");
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton asChild isActive={isActive}>
                          <Link to={item.href}>
                            <item.icon className="size-4" />
                            <span>{item.name}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-green-600 text-white">
                    {user?.avatar || user?.name?.charAt(0) || "U"}
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{user?.name}</span>
                    <span className="truncate text-xs">
                      <span
                        className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                          user?.role === UserRole.ADMIN
                            ? "bg-red-100 text-red-800"
                            : user?.role === UserRole.OPERATOR
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
                        {user?.role}
                      </span>
                    </span>
                  </div>
                  <ChevronUp className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side={state === "collapsed" ? "right" : "bottom"}
                align="end"
                sideOffset={4}
              >
                <DropdownMenuItem onClick={() => window.location.href = "/profile"}>
                  <User className="mr-2 h-4 w-4" />
                  <span>Mi Perfil</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={logout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Cerrar sesión</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
