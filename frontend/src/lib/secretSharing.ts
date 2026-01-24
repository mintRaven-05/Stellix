// /**
//  * Shamir's Secret Sharing implementation for securing wallet secrets
//  * 
//  * This module provides functions to split a secret into multiple shares and reconstruct it.
//  * We use a 3-of-5 scheme: secret is split into 5 shares, any 3 can reconstruct it.
//  * 
//  * Shares are stored as a JSON string in the database instead of plaintext secrets.
//  */

// import secrets from 'secrets.js-grempe';

// // Configuration for Shamir's Secret Sharing
// const TOTAL_SHARES = 5;  // Total number of shares to create
// const THRESHOLD = 3;      // Minimum shares needed to reconstruct secret

// /**
//  * Splits a Stellar secret key into multiple shares using Shamir's Secret Sharing
//  * 
//  * @param secretKey - The Stellar secret key (base32 encoded, starts with 'S')
//  * @returns JSON string containing the shares array
//  */
// export function splitSecret(secretKey: string): string {
//   if (!secretKey || secretKey.length === 0) {
//     throw new Error('Secret key cannot be empty');
//   }

//   // Convert the secret key to hex format for secrets.js
//   const hexSecret = secrets.str2hex(secretKey);
  
//   // Split into shares (returns array of hex strings)
//   const shares = secrets.share(hexSecret, TOTAL_SHARES, THRESHOLD);
  
//   // Return shares as JSON string for storage
//   return JSON.stringify(shares);
// }

// /**
//  * Reconstructs a secret key from shares using Shamir's Secret Sharing
//  * 
//  * @param sharesJson - JSON string containing the shares array
//  * @returns The reconstructed Stellar secret key
//  */
// export function reconstructSecret(sharesJson: string): string {
//   if (!sharesJson || sharesJson.trim().length === 0) {
//     throw new Error('Shares cannot be empty');
//   }

//   try {
//     // Parse the shares from JSON
//     const shares: string[] = JSON.parse(sharesJson);
    
//     if (!Array.isArray(shares) || shares.length < THRESHOLD) {
//       throw new Error(`Need at least ${THRESHOLD} shares to reconstruct secret`);
//     }

//     // Use only the threshold number of shares for reconstruction
//     const sharesToUse = shares.slice(0, THRESHOLD);
    
//     // Combine shares to reconstruct the secret (returns hex)
//     const hexSecret = secrets.combine(sharesToUse);
    
//     // Convert hex back to the original secret key
//     const secretKey = secrets.hex2str(hexSecret);
    
//     return secretKey;
//   } catch (error) {
//     console.error('Error reconstructing secret:', error);
//     throw new Error('Failed to reconstruct secret from shares');
//   }
// }

// /**
//  * Validates that a shares JSON string is properly formatted
//  * 
//  * @param sharesJson - JSON string to validate
//  * @returns true if valid, false otherwise
//  */
// export function validateShares(sharesJson: string): boolean {
//   try {
//     const shares = JSON.parse(sharesJson);
//     return Array.isArray(shares) && shares.length === TOTAL_SHARES;
//   } catch {
//     return false;
//   }
// }

// /**
//  * Gets the number of shares required to reconstruct the secret
//  */
// export function getThreshold(): number {
//   return THRESHOLD;
// }

// /**
//  * Gets the total number of shares created for each secret
//  */
// export function getTotalShares(): number {
//   return TOTAL_SHARES;
// }

// /**
//  * Splits multiple secrets (for multiple wallet addresses)
//  * 
//  * @param secrets - Array of secret keys
//  * @returns Array of shares JSON strings
//  */
// export function splitMultipleSecrets(secrets: string[]): string[] {
//   return secrets.map(secret => splitSecret(secret));
// }

// /**
//  * Reconstructs multiple secrets (for multiple wallet addresses)
//  * 
//  * @param sharesJsonArray - Array of shares JSON strings
//  * @returns Array of reconstructed secret keys
//  */
// export function reconstructMultipleSecrets(sharesJsonArray: string[]): string[] {
//   return sharesJsonArray.map(sharesJson => reconstructSecret(sharesJson));
// }
