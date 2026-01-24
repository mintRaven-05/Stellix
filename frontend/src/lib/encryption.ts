/**
 * Simple encryption/decryption for wallet secrets
 * Uses AES-GCM with a fixed key derived from environment variable
 */

// Fixed encryption key - should be stored in environment variable in production
const ENCRYPTION_KEY = process.env.NEXT_PUBLIC_ENCRYPTION_KEY || 'stellix-default-encryption-key-2026';

async function getEncryptionKey(): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(ENCRYPTION_KEY.padEnd(32, '0').substring(0, 32));
  return crypto.subtle.importKey('raw', keyData, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

/**
 * Encrypts a secret string
 */
export async function encryptSecret(secret: string): Promise<string> {
  const key = await getEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoder = new TextEncoder();
  const data = encoder.encode(secret);
  
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );
  
  // Combine IV and encrypted data
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  // Convert to base64
  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypts an encrypted secret string
 */
export async function decryptSecret(encryptedSecret: string): Promise<string> {
  const key = await getEncryptionKey();
  
  // Convert from base64
  const combined = Uint8Array.from(atob(encryptedSecret), c => c.charCodeAt(0));
  
  // Extract IV and encrypted data
  const iv = combined.slice(0, 12);
  const data = combined.slice(12);
  
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );
  
  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

/**
 * Helper to encrypt terminal - for manual migration
 */
export async function encryptForTerminal(secret: string): Promise<void> {
  const encrypted = await encryptSecret(secret);
  console.log('Encrypted:', encrypted);
}
