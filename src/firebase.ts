import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  doc,
  getDocFromServer,
  enableNetwork,
  type Firestore
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const databaseId = (firebaseConfig as { firestoreDatabaseId?: string }).firestoreDatabaseId;

// CRITICAL: Pass firestoreDatabaseId from firebase-applet-config.json.
// Use default auto-detect long-polling (native WebChannel with automatic fallback on buffering proxies)
// and avoid overriding long-polling timeouts so initial handshakes settle cleanly.
let firestoreInstance: Firestore;
try {
  firestoreInstance = initializeFirestore(
    app,
    {
      experimentalAutoDetectLongPolling: true,
      ignoreUndefinedProperties: true
    },
    databaseId
  );
} catch {
  firestoreInstance = databaseId ? getFirestore(app, databaseId) : getFirestore(app);
}

export const db = firestoreInstance;
export const auth = getAuth(app);

// Quick REST reachability check to distinguish genuine Firebase config errors from transient WebChannel slowness
async function isFirestoreEndpointReachable(): Promise<boolean> {
  if (typeof fetch === 'undefined') return false;
  const projectId = (firebaseConfig as { projectId?: string }).projectId;
  const apiKey = (firebaseConfig as { apiKey?: string }).apiKey;
  if (!projectId || !apiKey) return false;

  const targetDb = databaseId || '(default)';
  const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
    projectId
  )}/databases/${encodeURIComponent(targetDb)}/documents/test/connection?key=${encodeURIComponent(
    apiKey
  )}`;

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutId = controller ? setTimeout(() => controller.abort(), 8000) : null;
  try {
    const res = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      signal: controller?.signal
    });
    // 200 (exists) or 404 (doc absent, project/database/rules valid) confirms config & reachability
    return res.status === 200 || res.status === 404;
  } catch {
    return false;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// Validate Connection to Firestore per Firebase Skill guidelines.
// Runs before heavy collection listeners (memories/background) attach so the initial 0-byte handshake
// transitions OnlineStateTracker to Online immediately instead of timing out behind multi-MB snapshots.
async function testConnection(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return false;
  }

  const maxAttempts = 2;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await getDocFromServer(doc(db, 'test', 'connection'));
      return true;
    } catch (error) {
      if (error instanceof Error && error.message.includes('the client is offline')) {
        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
          return false;
        }

        if (attempt < maxAttempts) {
          await enableNetwork(db).catch(() => {});
          await delay(3000);
          continue;
        }

        // Verify whether the Firebase configuration itself is invalid or if only the Watch stream was temporarily slow
        const reachable = await isFirestoreEndpointReachable();
        if (reachable) {
          await enableNetwork(db).catch(() => {});
          return true;
        }

        console.error('Please check your Firebase configuration.');
        return false;
      }
      // Non-offline errors (e.g., permission-denied on non-existent test doc) still mean the backend responded
      return true;
    }
  }

  return false;
}

const initialConnectionPromise: Promise<boolean> = testConnection();

/**
 * Waits briefly for the initial lightweight Firestore connection handshake to complete
 * before attaching heavy real-time collection listeners (preventing head-of-line blocking
 * on the shared Watch stream). Never blocks longer than `maxWaitMs`.
 */
export function waitForInitialConnection(maxWaitMs = 4000): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(finish, maxWaitMs);
    initialConnectionPromise.then(finish, finish);
  });
}

// Re-enable Firestore network immediately when browser / iPhone returns online
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    enableNetwork(db).catch(() => {});
    void testConnection();
  });
}
