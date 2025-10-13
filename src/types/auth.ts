// Definición de roles disponibles en el sistema (basado en códigos del backend)
export const UserRole = {
  ADMIN: 'role-admin',
  OPERATOR: 'role-operator',
  USER: 'role-user',
  GUEST: 'role-guest'
} as const;

export type UserRole = typeof UserRole[keyof typeof UserRole];



// Interface para el rol desde el backend
export interface Role {
  id: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  name: string;
  code: string;
  description: string;
  status: string;
}

// Interface para el customer desde el backend
export interface Customer {
  // Definir cuando sea necesario
  [key: string]: any;
}

// Interface para el operador desde el backend
export interface Operator {
  id: number;
  branch: {
    id: number;
    name: string;
    city: string;
    address?: string;
  };
}

// Interface para el usuario desde el backend
export interface BackendUser {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  customer: Customer | null;
  operator?: Operator | null;
}

// Interface para el usuario normalizada para el frontend
export interface User {
  id: string;
  email: string;
  name: string; // firstName + lastName combinados
  firstName: string;
  lastName: string;
  role: UserRole;
  roleDetails: Role; // Información completa del rol
  avatar?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
  customer: Customer | null;
  operator?: Operator | null;
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

// Interface para la respuesta de login del backend
export interface LoginResponse {
  user: BackendUser;
  token: string;
}

// Props para componentes de protección de rutas
export interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole | UserRole[];
  fallback?: React.ReactNode;
  redirectTo?: string;
  requireAllRoles?: boolean; // Para determinar si requiere TODOS los roles o solo UNO
}




