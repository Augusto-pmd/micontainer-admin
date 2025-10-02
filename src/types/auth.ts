// Definición de roles disponibles en el sistema
export const UserRole = {
  ADMIN: 'admin',
  USER: 'user',
  MODERATOR: 'moderator',
  GUEST: 'guest'
} as const;

export type UserRole = typeof UserRole[keyof typeof UserRole];

// Definición de permisos específicos
export const Permission = {
  READ_USERS: 'read:users',
  WRITE_USERS: 'write:users',
  DELETE_USERS: 'delete:users',
  READ_ADMIN: 'read:admin',
  WRITE_ADMIN: 'write:admin',
  READ_REPORTS: 'read:reports',
  WRITE_REPORTS: 'write:reports',
  MANAGE_ROLES: 'manage:roles'
} as const;

export type Permission = typeof Permission[keyof typeof Permission];

// Interface para el usuario
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  permissions: Permission[];
  avatar?: string;
  isActive: boolean;
  createdAt: Date;
  lastLogin?: Date;
}

// Estado de autenticación
export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// Acciones de autenticación
export interface AuthActions {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
  setToken: (token: string) => void;
  clearError: () => void;
  checkAuth: () => Promise<void>;
  updateUserRole: (userId: string, role: UserRole) => Promise<void>;
}

// Store completo de autenticación
export interface AuthStore extends AuthState, AuthActions {}

// Props para componentes de protección de rutas
export interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole | UserRole[]; // Ahora puede ser un rol individual o un array de roles
  requiredPermissions?: Permission[];
  fallback?: React.ReactNode;
  redirectTo?: string;
  requireAllRoles?: boolean; // Para determinar si requiere TODOS los roles o solo UNO
}

// Configuración de roles y sus permisos por defecto
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.ADMIN]: [
    Permission.READ_USERS,
    Permission.WRITE_USERS,
    Permission.DELETE_USERS,
    Permission.READ_ADMIN,
    Permission.WRITE_ADMIN,
    Permission.READ_REPORTS,
    Permission.WRITE_REPORTS,
    Permission.MANAGE_ROLES
  ],
  [UserRole.MODERATOR]: [
    Permission.READ_USERS,
    Permission.WRITE_USERS,
    Permission.READ_REPORTS,
    Permission.WRITE_REPORTS
  ],
  [UserRole.USER]: [
    Permission.READ_USERS
  ],
  [UserRole.GUEST]: []
};


