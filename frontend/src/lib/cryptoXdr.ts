function hexToBytes(hex: string) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function bytesToBase64(bytes: Uint8Array) {
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin);
}

function base64ToBytes(b64: string) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export async function sha256Hex(input: string): Promise<string> {
  const enc = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', enc);
  const bytes = new Uint8Array(hashBuffer);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Derive AES key from sha256(otp) bytes
async function importAesKeyFromOtpHashHex(otpHashHex: string) {
  const keyBytes = hexToBytes(otpHashHex); // 32 bytes
  return crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

export async function encryptSignedXdr(params: {
  signedXdr: string;
  otp: string; // 6-digit
}) {
  const otpHashHex = await sha256Hex(params.otp);

  const key = await importAesKeyFromOtpHashHex(otpHashHex);

  const iv = crypto.getRandomValues(new Uint8Array(12)); // AES-GCM standard 12 bytes
  const plaintext = new TextEncoder().encode(params.signedXdr);

  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);

  return {
    otpHashHex,
    encryptedXdrB64: bytesToBase64(new Uint8Array(ciphertext)),
    ivB64: bytesToBase64(iv),
  };
}

export async function decryptSignedXdr(params: {
  encryptedXdrB64: string;
  ivB64: string;
  otp: string;
  otpHashHexExpected: string;
}) {
  const otpHashHex = await sha256Hex(params.otp);
  if (otpHashHex !== params.otpHashHexExpected) {
    throw new Error('Invalid OTP');
  }

  const key = await importAesKeyFromOtpHashHex(otpHashHex);
  const iv = base64ToBytes(params.ivB64);
  const ciphertextBytes = base64ToBytes(params.encryptedXdrB64);

  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertextBytes);
  return new TextDecoder().decode(new Uint8Array(plaintext));
}
