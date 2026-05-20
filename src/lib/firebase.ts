import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';

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

export async function signInWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  const email = result.user.email ?? '';
  if (!email.endsWith(`@${ALLOWED_DOMAIN}`)) {
    await signOut(auth);
    throw new Error(`Acceso restringido a cuentas @${ALLOWED_DOMAIN}`);
  }
  return result.user;
}

export { signOut };
