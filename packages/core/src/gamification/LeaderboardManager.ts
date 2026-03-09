import type { LeaderboardEntry } from '../config/types';
import type { User } from '../config/types';

export class LeaderboardManager {
  private db: any = null;
  private collection: string;
  private currentUser: User | null = null;

  constructor(collection: string) {
    this.collection = collection;
  }

  async init(firebaseApp: any, user: User | null): Promise<void> {
    const { getFirestore } = await import('firebase/firestore');
    this.db = getFirestore(firebaseApp);
    this.currentUser = user;
  }

  setUser(user: User | null): void {
    this.currentUser = user;
  }

  async submitScore(score: number): Promise<void> {
    if (!this.db || !this.currentUser) return;
    try {
      const { collection, addDoc, query, where, getDocs, deleteDoc } = await import(
        'firebase/firestore'
      );
      const col = collection(this.db, this.collection);

      // Keep only best score per user — remove old lower scores
      const existing = await getDocs(
        query(col, where('uid', '==', this.currentUser.uid)),
      );
      const hasBetter = existing.docs.some((d) => d.data().score >= score);
      if (hasBetter) return;

      // Remove previous entries for this user
      await Promise.all(existing.docs.map((d) => deleteDoc(d.ref)));

      await addDoc(col, {
        uid: this.currentUser.uid,
        displayName: this.currentUser.displayName ?? this.currentUser.email ?? 'Anonymous',
        score,
        createdAt: Date.now(),
      });
    } catch {
      // Best-effort; offline play shouldn't break the game
    }
  }

  async getTopScores(limit = 10): Promise<LeaderboardEntry[]> {
    if (!this.db) return [];
    try {
      const { collection, query, orderBy, limit: fbLimit, getDocs } = await import(
        'firebase/firestore'
      );
      const col = collection(this.db, this.collection);
      const q = query(col, orderBy('score', 'desc'), fbLimit(limit));
      const snap = await getDocs(q);
      return snap.docs.map((doc, i) => ({
        uid: doc.data().uid,
        displayName: doc.data().displayName,
        score: doc.data().score,
        rank: i + 1,
        createdAt: doc.data().createdAt,
      }));
    } catch {
      return [];
    }
  }

  async getUserRank(): Promise<number> {
    if (!this.db || !this.currentUser) return -1;
    try {
      const { collection, query, orderBy, getDocs } = await import('firebase/firestore');
      const col = collection(this.db, this.collection);
      const q = query(col, orderBy('score', 'desc'));
      const snap = await getDocs(q);
      const idx = snap.docs.findIndex((d) => d.data().uid === this.currentUser!.uid);
      return idx === -1 ? -1 : idx + 1;
    } catch {
      return -1;
    }
  }
}
