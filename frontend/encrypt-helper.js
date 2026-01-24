/**
 * Terminal helper to encrypt/decrypt secrets for manual migration
 * 
 * Run in browser console:
 * 1. Open browser dev tools (F12)
 * 2. Copy this ENTIRE file and paste in console
 * 3. To ENCRYPT: await encryptSecret('YOUR_SECRET_KEY')
 * 4. To DECRYPT: await decryptSecret('ENCRYPTED_STRING')
 */

// ⚠️ IMPORTANT: This must match the key in your .env.local file
// Change this to your actual encryption key!
const ENCRYPTION_KEY = 'bf1f1e3edd522ae7830ae9415f3480ac6b7182f98e324bb07803ffc8395788a1';

async function encryptSecret(secret) {
  
  const encoder = new TextEncoder();
  const keyData = encoder.encode(ENCRYPTION_KEY.padEnd(32, '0').substring(0, 32));
  const key = await crypto.subtle.importKey('raw', keyData, { name: 'AES-GCM' }, false, ['encrypt']);
  
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = encoder.encode(secret);
  
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);
  
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  const encryptedBase64 = btoa(String.fromCharCode(...combined));
  
  console.log('Original:', secret);
  console.log('Encrypted:', encryptedBase64);
  return encryptedBase64;
}

async function decryptSecret(encryptedSecret) {
  
  const encoder = new TextEncoder();
  const keyData = encoder.encode(ENCRYPTION_KEY.padEnd(32, '0').substring(0, 32));
  const key = await crypto.subtle.importKey('raw', keyData, { name: 'AES-GCM' }, false, ['decrypt']);
  
  const combined = Uint8Array.from(atob(encryptedSecret), c => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const data = combined.slice(12);
  
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
  const decoder = new TextDecoder();
  const decryptedSecret = decoder.decode(decrypted);
  
  console.log('Encrypted:', encryptedSecret);
  console.log('Decrypted:', decryptedSecret);
  return decryptedSecret;
}

console.log('✅ Encryption helpers loaded!');
console.log('');
console.log('📝 Current encryption key:', ENCRYPTION_KEY);
console.log('⚠️  Make sure this matches your .env.local NEXT_PUBLIC_ENCRYPTION_KEY');
console.log('');
console.log('To ENCRYPT a secret:');
console.log('  await encryptSecret("SXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX")');
console.log('');
console.log('To DECRYPT (verify):');
console.log('  await decryptSecret("encrypted_base64_string")');
