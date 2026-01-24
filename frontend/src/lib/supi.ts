// Generate sUPI ID based on email + 6 random alphanumeric characters
export function generateSUPIId(email: string): string {
  const emailPrefix = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
  const randomChars = Array.from({ length: 6 }, () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    return chars[Math.floor(Math.random() * chars.length)];
  }).join('');
  
  return `${emailPrefix}${randomChars}`;
}

// User data structure for Appwrite
export interface UserData {
  supid: string;
  walletAddresses: string[]; // Array of wallet addresses
  primaryWallet: string; // The default wallet for transactions
  walletSecrets: string[]; // Array of wallet secret keys (encrypted in production)
  primarySecret: string; // The default wallet secret key (encrypted in production)
  supi_pin: string; // 6-digit PIN for transaction authorization (plaintext for now)
  email: string;
  dateCreated: string;
  name?: string;
}
