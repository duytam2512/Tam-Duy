/**
 * Password hashing and verification using Web Crypto API (SHA-256)
 */

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyPassword(password: string, expectedHash: string): Promise<boolean> {
  if (!expectedHash) return true;
  const hash = await hashPassword(password);
  return hash.toLowerCase() === expectedHash.toLowerCase();
}

// Session-based unlocked IDs storage (in memory)
const unlockedMediaIds = new Set<string>();
let isVaultUnlocked = false;

export function markMediaUnlocked(id: string) {
  unlockedMediaIds.add(id);
}

export function isMediaUnlocked(id: string): boolean {
  return unlockedMediaIds.has(id);
}

export function setVaultUnlockedState(unlocked: boolean) {
  isVaultUnlocked = unlocked;
}

export function getVaultUnlockedState(): boolean {
  return isVaultUnlocked;
}
