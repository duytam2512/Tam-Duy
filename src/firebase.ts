import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// CRITICAL: The app requires passing firestoreDatabaseId if configured
export const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId || undefined);

// Kiểm tra kết nối Firestore lúc khởi động
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase Firestore đang ở chế độ offline.');
    }
  }
}

testConnection();
