// /**
//  * Migration utility to convert plaintext secrets to Shamir's Secret Sharing
//  * 
//  * This file contains utilities to help migrate existing users from the old
//  * plaintext secret storage to the new Shamir's Secret Sharing system.
//  * 
//  * Run this once for each user during their first login after the update.
//  */

// import { databases, Query } from '@/lib/appwrite';
// import { splitSecret } from './secretSharing';

// interface OldUserData {
//   $id: string;
//   email: string;
//   walletSecrets?: string[];
//   primarySecret?: string;
//   walletSecretShares?: string[];
//   primarySecretShares?: string;
// }

// /**
//  * Checks if a user needs migration (has old plaintext secrets)
//  */
// export function needsMigration(userData: any): boolean {
//   // If user has walletSecrets (old field) but not walletSecretShares (new field)
//   return !!(
//     userData?.walletSecrets && 
//     Array.isArray(userData.walletSecrets) && 
//     userData.walletSecrets.length > 0 &&
//     !userData?.walletSecretShares
//   );
// }

// /**
//  * Migrates a user's plaintext secrets to Shamir shares
//  * 
//  * @param email - User's email address
//  * @returns true if migration was successful, false otherwise
//  */
// export async function migrateUserSecrets(email: string): Promise<boolean> {
//   try {
//     const dbId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
//     const usersCol = process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID!;

//     // Fetch the user document
//     const response = await databases.listDocuments(dbId, usersCol, [
//       Query.equal('email', email),
//       Query.limit(1),
//     ]);

//     if (response.documents.length === 0) {
//       console.error('User not found for migration:', email);
//       return false;
//     }

//     const userData = response.documents[0] as any as OldUserData;

//     // Check if migration is needed
//     if (!needsMigration(userData)) {
//       console.log('User does not need migration:', email);
//       return true; // Already migrated or no secrets to migrate
//     }

//     console.log('Starting migration for user:', email);

//     // Split all wallet secrets into shares
//     const walletSecretShares: string[] = [];
//     if (userData.walletSecrets && userData.walletSecrets.length > 0) {
//       for (const secret of userData.walletSecrets) {
//         const shares = splitSecret(secret);
//         walletSecretShares.push(shares);
//       }
//     }

//     // Split primary secret into shares
//     let primarySecretShares = '';
//     if (userData.primarySecret) {
//       primarySecretShares = splitSecret(userData.primarySecret);
//     }

//     // Update the document with new shares and remove old fields
//     await databases.updateDocument(dbId, usersCol, userData.$id, {
//       walletSecretShares,
//       primarySecretShares,
//       // Note: We keep the old fields for backward compatibility during transition
//       // You can remove these lines after all users are migrated:
//       // walletSecrets: null,
//       // primarySecret: null,
//     });

//     console.log('Successfully migrated user:', email);
//     return true;
//   } catch (error) {
//     console.error('Error migrating user secrets:', email, error);
//     return false;
//   }
// }

// /**
//  * Attempts automatic migration when user logs in
//  * Call this in the AuthContext after successful login
//  */
// export async function autoMigrateOnLogin(userData: any): Promise<void> {
//   if (needsMigration(userData)) {
//     console.log('Auto-migrating user on login...');
//     await migrateUserSecrets(userData.email);
//   }
// }
