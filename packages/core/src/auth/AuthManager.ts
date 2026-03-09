import type { User, Unsubscribe, FirebaseOptions } from '../config/types';

export interface IAuthManager {
  init(firebaseConfig: FirebaseOptions): Promise<void>;
  register(email: string, password: string): Promise<User>;
  login(email: string, password: string): Promise<User>;
  loginWithGoogle(): Promise<User>;
  loginAnonymously(): Promise<User>;
  logout(): Promise<void>;
  getCurrentUser(): User | null;
  onAuthChange(cb: (user: User | null) => void): Unsubscribe;
}

/**
 * Firebase-backed authentication manager.
 * Uses dynamic import so Firebase is tree-shaken when not used.
 */
export class AuthManager implements IAuthManager {
  private auth: any = null;
  private currentUser: User | null = null;
  private listeners: Set<(user: User | null) => void> = new Set();

  async init(firebaseConfig: FirebaseOptions): Promise<void> {
    const { initializeApp, getApps } = await import('firebase/app');
    const { getAuth, onAuthStateChanged } = await import('firebase/auth');

    const appId = firebaseConfig.appId;
    const existingApp = getApps().find((a) => a.options.appId === appId);
    const app = existingApp ?? initializeApp(firebaseConfig, firebaseConfig.projectId);
    this.auth = getAuth(app);

    onAuthStateChanged(this.auth, (fbUser) => {
      this.currentUser = fbUser ? this.mapUser(fbUser) : null;
      this.listeners.forEach((cb) => cb(this.currentUser));
    });
  }

  async register(email: string, password: string): Promise<User> {
    const { createUserWithEmailAndPassword } = await import('firebase/auth');
    const cred = await createUserWithEmailAndPassword(this.auth, email, password);
    return this.mapUser(cred.user);
  }

  async login(email: string, password: string): Promise<User> {
    const { signInWithEmailAndPassword } = await import('firebase/auth');
    const cred = await signInWithEmailAndPassword(this.auth, email, password);
    return this.mapUser(cred.user);
  }

  async loginWithGoogle(): Promise<User> {
    const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(this.auth, provider);
    return this.mapUser(cred.user);
  }

  async loginAnonymously(): Promise<User> {
    const { signInAnonymously } = await import('firebase/auth');
    const cred = await signInAnonymously(this.auth);
    return this.mapUser(cred.user);
  }

  async logout(): Promise<void> {
    const { signOut } = await import('firebase/auth');
    await signOut(this.auth);
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  onAuthChange(cb: (user: User | null) => void): Unsubscribe {
    this.listeners.add(cb);
    // Immediately call with current state
    cb(this.currentUser);
    return () => this.listeners.delete(cb);
  }

  private mapUser(fbUser: any): User {
    return {
      uid: fbUser.uid,
      email: fbUser.email,
      displayName: fbUser.displayName,
      photoURL: fbUser.photoURL,
      isAnonymous: fbUser.isAnonymous,
    };
  }
}
