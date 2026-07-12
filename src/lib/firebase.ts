import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDvlEk1cRr61Mls989BGuvNlogRHX30qAU",
  authDomain: "mc-nordelta-2026.firebaseapp.com",
  projectId: "mc-nordelta-2026",
  storageBucket: "mc-nordelta-2026.firebasestorage.app",
  messagingSenderId: "331447282240",
  appId: "1:331447282240:web:db79cca7e572bd6b3b8da5"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

/** Solo permite acceso a cuentas @micontainer.com */
export const ALLOWED_DOMAIN = 'micontainer.com';

/** Staff con email fuera de @micontainer.com. Debe coincidir con la allowlist requireStaff del backend. */
export const ALLOWED_EMAILS = [
  'augustomn29@gmail.com',
  'amorporloshierros@gmail.com',
  'l.lanzalot@pmdarquitectura.com',
  'info@pmdarquitectura.com',
  'micontainer.storage@gmail.com',
];

/** Detecta celulares/tablets: el popup de Google no funciona ahi, hay que usar redirect. */
export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(
    navigator.userAgent
  );
}

// FUENTE ÚNICA (12/07): la allowlist vive en el BACKEND (requireStaff). El login consulta
// POST /auth/is-staff; la lista local ALLOWED_EMAILS queda SOLO como fallback si el backend
// no responde. Así no hay más 2 listas a sincronizar a mano.
async function assertAllowedDomain(user: User): Promise<User> {
  const email = (user.email ?? '').toLowerCase();
  let allowed: boolean | null = null;
  try {
    const r = await fetch(`${import.meta.env.VITE_API_URL}/auth/is-staff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (r.ok) allowed = !!(await r.json()).staff;
  } catch { /* sin red: cae al fallback local */ }
  if (allowed === null) allowed = email.endsWith(`@${ALLOWED_DOMAIN}`) || ALLOWED_EMAILS.includes(email);
  if (!allowed) {
    void signOut(auth);
    throw new Error('Tu cuenta no tiene acceso al panel. Pedile al administrador que te agregue.');
  }
  return user;
}

/**
 * Inicia sesion con Google. Popup para TODOS los dispositivos (desktop y mobile:
 * Android/Chrome, iPhone/Safari, etc.), porque el redirect esta roto en muchos
 * navegadores moviles por el bloqueo de cookies de terceros. Si el popup esta
 * bloqueado o no soportado, cae automaticamente a redirect (procesado por
 * completeGoogleRedirect al volver).
 */
export async function signInWithGoogle(): Promise<User | null> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return assertAllowedDomain(result.user);
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code || '';
    if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
      await signInWithRedirect(auth, googleProvider);
      return null;
    }
    throw err;
  }
}

/**
 * Login REAL con email y contraseña (Firebase Auth). Antes el form era simbólico (pegaba a un
 * endpoint que devolvía un token de mentira). Aplica la MISMA allowlist que Google: si el email
 * no es de staff, se cierra la sesión y tira error. La contraseña se crea/cambia con el mail de
 * "¿Olvidaste tu contraseña?" (los que entran con Google pueden sumarse una con ese mismo flujo).
 */
export async function signInWithEmail(email: string, password: string): Promise<User> {
  const result = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
  return assertAllowedDomain(result.user);
}

/** Procesa el resultado del login por redirect (mobile). Devuelve el usuario o null. */
export async function completeGoogleRedirect(): Promise<User | null> {
  const result = await getRedirectResult(auth);
  if (!result?.user) return null;
  return assertAllowedDomain(result.user);
}

export { signOut };
