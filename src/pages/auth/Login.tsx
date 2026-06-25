import { Button } from '@/components';
import { useAuth } from '@/stores/authStore';
import React, { useState, useEffect } from 'react';
import { Navigate, Link } from 'react-router-dom';
import MiContainerLogo from '@/assets/img/MiContainerLogo.png';
import { signInWithGoogle, completeGoogleRedirect } from '@/lib/firebase';
import { UserRole } from '@/types/auth';
import { api } from '@/services/api';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, isAuthenticated, error, clearError, setUser, setToken } = useAuth();
  const [googleError, setGoogleError] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);

  // Si ya esta autenticado, redirigir al dashboard
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // Aplica el usuario de Firebase al store (token + rol real + datos)
  const applyUser = async (fbUser: any) => {
    const idToken = await fbUser.getIdToken();
    setToken(idToken);
    api.defaults.headers.common['Authorization'] = `Bearer ${idToken}`;

    // Buscar el operador registrado para obtener su rol real
    let role: UserRole = UserRole.ADMIN; // fallback
    try {
      const opRes = await api.get('/operator?limit=200');
      const ops = opRes.data?.data ?? [];
      const match = ops.find((o: any) => o.email?.toLowerCase() === (fbUser.email ?? '').toLowerCase());
      if (match?.role) {
        role = match.role === 'role-operator' ? UserRole.OPERATOR : UserRole.ADMIN;
      }
    } catch { /* si falla la busqueda, se queda con ADMIN */ }

    setUser({
      id: fbUser.uid,
      name: fbUser.displayName ?? fbUser.email ?? '',
      firstName: fbUser.displayName?.split(' ')[0] ?? '',
      lastName: fbUser.displayName?.split(' ').slice(1).join(' ') ?? '',
      email: fbUser.email ?? '',
      role: role as any,
      isActive: true,
      avatar: fbUser.displayName?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) ?? 'MC',
    } as any);
  };

  // Al volver del login por redirect (mobile), procesar el resultado
  useEffect(() => {
    setGoogleLoading(true);
    completeGoogleRedirect()
      .then((u) => { if (u) return applyUser(u); })
      .catch((err: any) => setGoogleError(err.message ?? 'Error al iniciar sesion con Google'))
      .finally(() => setGoogleLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setGoogleError('');
    try {
      const fbUser = await signInWithGoogle();
      // En mobile redirige y vuelve por el useEffect (fbUser === null)
      if (fbUser) await applyUser(fbUser);
    } catch (err: any) {
      setGoogleError(err.message ?? 'Error al iniciar sesion con Google');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    clearError();

    try {
      await login(email, password);
    } catch (error) {
      console.error('Error de login:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-24 w-auto flex items-center justify-center">
            <img
              src={MiContainerLogo}
              alt="MiContainer Logo"
              className="h-40 w-auto"
            />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Iniciar Sesion
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Mi Container - Sistema de Gestion
          </p>
        </div>

        {/* Google login */}
        <div className="mt-6">
          {googleError && (
            <div className="mb-3 bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-700">
              {googleError}
            </div>
          )}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/><path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/><path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z"/><path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z"/></svg>
            {googleLoading ? 'Conectando...' : 'Continuar con Google (@micontainer.com)'}
          </button>
          <div className="mt-4 flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400">o con usuario y contrasena</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>
        </div>

        <form className="mt-4 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Contrasena
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm"
                placeholder="Contrasena"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-end">
            <div className="text-sm">
              <Link
                to="/forgot-password"
                className="font-medium text-green-600 hover:text-green-500"
              >
                Olvidaste tu contrasena?
              </Link>
            </div>
          </div>

          <div>
            <Button
              type="submit"
              disabled={isSubmitting}
              loading={isSubmitting}
              variant="primary"
              fullWidth
            >
              Iniciar Sesion
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
