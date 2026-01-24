// src/lib/otp.ts

export function generateOtp6(): string {
  // 6-digit OTP
  return (Math.floor(100000 + Math.random() * 900000)).toString();
}

export async function sha256Hex(input: string): Promise<string> {
  // Browser WebCrypto SHA-256 -> hex string
  const enc = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', enc);
  const bytes = new Uint8Array(hashBuffer);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function computeExpiryIso(hoursFromNow: number): string {
  return new Date(Date.now() + hoursFromNow * 60 * 60 * 1000).toISOString();
}
