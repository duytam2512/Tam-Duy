import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// CRITICAL: The app requires passing firestoreDatabaseId if configured
// experimentalForceLongPolling eliminates the 10-second backend timeout in Cloud Run / iframes / mobile browsers
export const db = initializeFirestore(
  app,
  {
    experimentalForceLongPolling: true,
  },
  (firebaseConfig as any).firestoreDatabaseId
);

// Validate Connection to Firestore per Firebase Skill guidelines
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

testConnection();

