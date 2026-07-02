import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
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

/** Detecta celulares/tablets: el popup de Google no funciona ahi, hay que usar redirect. */
export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(
    navigator.userAgent
  );
}

function assertAllowedDomain(user: User): User {
  const email = user.email ?? '';
  if (!email.endsWith(`@${ALLOWED_DOMAIN}`)) {
    void signOut(auth);
    throw new Error(`Acceso restringido a cuentas @${ALLOWED_DOMAIN}`);
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

/** Procesa el resultado del login por redirect (mobile). Devuelve el usuario o null. */
export async function completeGoogleRedirect(): Promise<User | null> {
  const result = await getRedirectResult(auth);
  if (!result?.user) return null;
  return assertAllowedDomain(result.user);
}

export { signOut };
