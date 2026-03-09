/**
 * StorageManager: local-first storage with optional Firestore cloud sync.
 * Falls back to localStorage when not authenticated.
 */
export class StorageManager {
  private prefix: string;
  private db: any = null;
  private uid: string | null = null;

  constructor(gameId: string) {
    this.prefix = `mg_${gameId}_`;
  }

  /** Call after auth to enable cloud sync */
  async enableCloudSync(firebaseApp: any, uid: string): Promise<void> {
    const { getFirestore } = await import('firebase/firestore');
    this.db = getFirestore(firebaseApp);
    this.uid = uid;
  }

  disableCloudSync(): void {
    this.db = null;
    this.uid = null;
  }

  get<T>(key: string, defaultValue: T): T {
    const raw = localStorage.getItem(this.prefix + key);
    if (raw === null) return defaultValue;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return defaultValue;
    }
  }

  set<T>(key: string, value: T): void {
    localStorage.setItem(this.prefix + key, JSON.stringify(value));
    if (this.db && this.uid) {
      this.syncToCloud(key, value);
    }
  }

  delete(key: string): void {
    localStorage.removeItem(this.prefix + key);
  }

  private async syncToCloud(key: string, value: unknown): Promise<void> {
    if (!this.db || !this.uid) return;
    try {
      const { doc, setDoc } = await import('firebase/firestore');
      const ref = doc(this.db, 'playerData', this.uid, 'storage', key);
      await setDoc(ref, { value, updatedAt: Date.now() }, { merge: true });
    } catch {
      // Cloud sync is best-effort; local data is source of truth
    }
  }

  async loadFromCloud(): Promise<void> {
    if (!this.db || !this.uid) return;
    try {
      const { collection, getDocs } = await import('firebase/firestore');
      const snap = await getDocs(
        collection(this.db, 'playerData', this.uid, 'storage'),
      );
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.value !== undefined) {
          const localKey = this.prefix + docSnap.id;
          // Cloud wins for initial load, but only if local is empty
          if (localStorage.getItem(localKey) === null) {
            localStorage.setItem(localKey, JSON.stringify(data.value));
          }
        }
      });
    } catch {
      // Fail silently
    }
  }
}
