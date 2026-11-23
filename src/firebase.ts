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
// Use experimentalAutoDetectLongPolling (fast native WebChannel by default, auto-falls back to long-polling only when a proxy blocks streaming)
// instead of experimentalForceLongPolling, which severely slows large photo collection syncs and causes 10-second timeouts.
let firestoreInstance: Firestore;
try {
  firestoreInstance = initializeFirestore(
    app,
    {
      experimentalAutoDetectLongPolling: true,
      experimentalLongPollingOptions: {
        timeoutSeconds: 20
      },
      ignoreUndefinedProperties: true
    },
    databaseId
  );
} catch {
  firestoreInstance = databaseId ? getFirestore(app, databaseId) : getFirestore(app);
}

export const db = firestoreInstance;
export const auth = getAuth(app);

// Validate Connection to Firestore per Firebase Skill guidelines
async function testConnection(isRetry = false): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return;
  }

  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      if (!isRetry && (typeof navigator === 'undefined' || navigator.onLine !== false)) {
        // Retry once after brief delay in case initial connection raced with large snapshot hydration
        setTimeout(() => {
          void testConnection(true);
        }, 2500);
        return;
      }
      console.error('Please check your Firebase configuration.');
    }
  }
}

void testConnection();

// Re-enable Firestore network immediately when browser / iPhone returns online
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    enableNetwork(db).catch(() => {});
    void testConnection(true);
  });
}
