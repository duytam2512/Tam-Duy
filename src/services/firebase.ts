import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { ConnectedAccount } from '../types';

export const SCOPES = [
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.photos.readonly',
];

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
// Add required Workspace scopes
SCOPES.forEach(scope => provider.addScope(scope));
// Prompt user to select an account so they can easily link different Google accounts
provider.setCustomParameters({
  prompt: 'select_account',
});

let isSigningIn = false;
let cachedAccessToken: string | null = null;
let currentActiveUser: User | null = null;

// Multi-account in-memory registry of active tokens
const connectedAccountsMap = new Map<string, ConnectedAccount>();

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    currentActiveUser = user;
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{
  user: User;
  accessToken: string;
  account: ConnectedAccount;
} | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Không nhận được Access Token từ Google Authenticator');
    }

    cachedAccessToken = credential.accessToken;
    currentActiveUser = result.user;

    const account: ConnectedAccount = {
      email: result.user.email || 'user@gmail.com',
      displayName: result.user.displayName || result.user.email || 'Người dùng Google',
      photoURL: result.user.photoURL || undefined,
      accessToken: cachedAccessToken,
      connectedAt: Date.now(),
      isPrimary: true,
    };

    connectedAccountsMap.set(account.email, account);

    return { user: result.user, accessToken: cachedAccessToken, account };
  } catch (error: unknown) {
    console.error('Google Sign In error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const linkAnotherGoogleAccount = async (): Promise<ConnectedAccount | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Không nhận được Access Token');
    }

    const account: ConnectedAccount = {
      email: result.user.email || 'contributor@gmail.com',
      displayName: result.user.displayName || result.user.email || 'Cộng tác viên Docs',
      photoURL: result.user.photoURL || undefined,
      accessToken: credential.accessToken,
      connectedAt: Date.now(),
      isPrimary: false,
    };

    connectedAccountsMap.set(account.email, account);
    return account;
  } catch (error: unknown) {
    console.error('Link another account error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const getTokenForEmail = (email?: string): string | null => {
  if (email && connectedAccountsMap.has(email)) {
    return connectedAccountsMap.get(email)?.accessToken || cachedAccessToken;
  }
  return cachedAccessToken;
};

export const getConnectedAccounts = (): ConnectedAccount[] => {
  return Array.from(connectedAccountsMap.values());
};

export const getCurrentUser = (): User | null => {
  return currentActiveUser;
};

export const logout = async () => {
  await signOut(auth);
  cachedAccessToken = null;
  currentActiveUser = null;
  connectedAccountsMap.clear();
};
