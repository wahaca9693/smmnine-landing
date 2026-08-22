import { getApp, getApps, initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  deleteUser,
  getAuth,
  onAuthStateChanged,
  reload,
  sendEmailVerification,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
};

function getFirebaseApp() {
  if (!config.apiKey || !config.authDomain || !config.projectId || !config.appId) throw new Error("FIREBASE_NOT_CONFIGURED");
  return getApps().length ? getApp() : initializeApp(config);
}

let persistence: Promise<void> | null = null;

export function getFirebaseAuth() {
  const auth = getAuth(getFirebaseApp());
  persistence ??= setPersistence(auth, browserLocalPersistence);
  return auth;
}

export async function firebaseCreateEmailUser(email: string, password: string): Promise<User> {
  const auth = getFirebaseAuth();
  await persistence;
  const result = await createUserWithEmailAndPassword(auth, email, password);
  return result.user;
}

export async function firebaseLogin(email: string, password: string): Promise<User> {
  const auth = getFirebaseAuth();
  await persistence;
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
}

export async function firebaseSendVerification(user: User, continueUrl: string): Promise<void> {
  await sendEmailVerification(user, {
    url: continueUrl,
    handleCodeInApp: false,
  });
}

export function firebaseGetCurrentUser(): Promise<User | null> {
  const auth = getFirebaseAuth();
  if (auth.currentUser) return Promise.resolve(auth.currentUser);
  return new Promise((resolve) => {
    let settled = false;
    const finish = (user: User | null) => {
      if (settled) return;
      settled = true;
      unsubscribe();
      window.clearTimeout(timeout);
      resolve(user);
    };
    const unsubscribe = onAuthStateChanged(auth, finish);
    const timeout = window.setTimeout(() => finish(auth.currentUser), 4000);
  });
}

export async function firebaseReloadUser(user: User): Promise<User> {
  await reload(user);
  return getFirebaseAuth().currentUser || user;
}

export async function firebaseDeleteUser(user: User): Promise<void> {
  await deleteUser(user);
}

export async function firebaseLogout(): Promise<void> {
  if (typeof window !== "undefined" && getApps().length) await signOut(getFirebaseAuth());
}
