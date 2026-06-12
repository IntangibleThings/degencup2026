import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, onSnapshot, getDocs, collection, writeBatch, deleteDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBQzArcCz7ld33lX_81ODAodXlJ4ptsjcs",
  authDomain: "degen-cup-2026-b42ca.firebaseapp.com",
  projectId: "degen-cup-2026-b42ca",
  storageBucket: "degen-cup-2026-b42ca.firebasestorage.app",
  messagingSenderId: "540284438342",
  appId: "1:540284438342:web:1a6d683a4681aa1bc38747",
  measurementId: "G-XFF46HFTR5"
};

const isConfigured = () => {
  return firebaseConfig.apiKey !== "YOUR_API_KEY_HERE" &&
         firebaseConfig.projectId !== "YOUR_PROJECT_ID_HERE";
};

let app: ReturnType<typeof initializeApp> | null = null;
let db: ReturnType<typeof getFirestore> | null = null;

if (isConfigured()) {
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    console.log('[FIREBASE] Initialized, project:', firebaseConfig.projectId);
  } catch (err) {
    console.error('[FIREBASE] Init failed:', err);
  }
}

export { db, isConfigured };

const GAME_DOC = 'games/world-cup-2026';
const MANAGERS_COL = `${GAME_DOC}/managers`;

// ========================================================================
// MANAGER OPERATIONS (one doc per manager = no overwriting)
// ========================================================================

export async function saveManager(manager: Record<string, unknown>): Promise<void> {
  if (!db) throw new Error('Firebase not configured');
  await setDoc(doc(db, MANAGERS_COL, manager.id as string), manager);
  console.log('[FIREBASE] Saved manager:', manager.name, 'teams:', (manager.teamCodes as string[])?.length || 0);
}

export async function loadAllManagers(): Promise<Record<string, unknown>[]> {
  if (!db) throw new Error('Firebase not configured');
  const snap = await getDocs(collection(db, MANAGERS_COL));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export function subscribeToManagers(
  callback: (managers: Record<string, unknown>[]) => void
): () => void {
  if (!db) return () => {};
  const unsub = onSnapshot(collection(db, MANAGERS_COL), (snap) => {
    const managers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    console.log('[FIREBASE] Managers update, count:', managers.length);
    callback(managers);
  }, (err) => {
    console.error('[FIREBASE] Managers sub error:', err);
  });
  return unsub;
}

export async function deleteManager(managerId: string): Promise<void> {
  if (!db) throw new Error('Firebase not configured');
  await deleteDoc(doc(db, MANAGERS_COL, managerId));
}

// ========================================================================
// SETTINGS & RESULTS (single doc, admin-controlled)
// ========================================================================

export async function saveSettings(settings: unknown): Promise<void> {
  if (!db) throw new Error('Firebase not configured');
  await setDoc(doc(db, GAME_DOC), { settings }, { merge: true });
}

export async function saveResults(results: unknown): Promise<void> {
  if (!db) throw new Error('Firebase not configured');
  await setDoc(doc(db, GAME_DOC), { results }, { merge: true });
}

export async function loadSettingsAndResults(): Promise<{ settings: unknown; results: unknown } | null> {
  if (!db) throw new Error('Firebase not configured');
  const snap = await getDoc(doc(db, GAME_DOC));
  if (snap.exists()) {
    const data = snap.data();
    return { settings: data.settings || {}, results: data.results || {} };
  }
  return null;
}

export function subscribeToSettingsAndResults(
  callback: (data: { settings: unknown; results: unknown }) => void
): () => void {
  if (!db) return () => {};
  const unsub = onSnapshot(doc(db, GAME_DOC), (snap) => {
    if (snap.exists()) {
      const data = snap.data();
      callback({ settings: data.settings || {}, results: data.results || {} });
    }
  }, (err) => {
    console.error('[FIREBASE] Settings sub error:', err);
  });
  return unsub;
}

// ========================================================================
// WAGER OPERATIONS (Degen Den side bets)
// ========================================================================

const WAGERS_COL = `${GAME_DOC}/wagers`;

export async function saveWager(wager: Record<string, unknown>): Promise<void> {
  if (!db) throw new Error('Firebase not configured');
  await setDoc(doc(db, WAGERS_COL, wager.id as string), wager);
  console.log('[FIREBASE] Saved wager:', wager.id);
}

export async function loadAllWagers(): Promise<Record<string, unknown>[]> {
  if (!db) throw new Error('Firebase not configured');
  const snap = await getDocs(collection(db, WAGERS_COL));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export function subscribeToWagers(
  callback: (wagers: Record<string, unknown>[]) => void
): () => void {
  if (!db) return () => {};
  const unsub = onSnapshot(collection(db, WAGERS_COL), (snap) => {
    const wagers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    console.log('[FIREBASE] Wagers update, count:', wagers.length);
    callback(wagers);
  }, (err) => {
    console.error('[FIREBASE] Wagers sub error:', err);
  });
  return unsub;
}

export async function deleteWager(wagerId: string): Promise<void> {
  if (!db) throw new Error('Firebase not configured');
  await deleteDoc(doc(db, WAGERS_COL, wagerId));
}

// ========================================================================
// FULL SYNC (for admin / initial load)
// ========================================================================

export async function syncAllToCloud(managers: Record<string, unknown>[], settings: unknown, results: unknown): Promise<void> {
  if (!db) throw new Error('Firebase not configured');
  const batch = writeBatch(db);

  // Upsert all managers
  for (const mgr of managers) {
    const ref = doc(db, MANAGERS_COL, mgr.id as string);
    batch.set(ref, mgr);
  }

  // Upsert settings + results
  const gameRef = doc(db, GAME_DOC);
  batch.set(gameRef, { settings, results }, { merge: true });

  await batch.commit();
  console.log('[FIREBASE] Full sync complete,', managers.length, 'managers');
}
