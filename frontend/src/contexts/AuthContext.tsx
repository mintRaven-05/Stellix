'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { account, databases, ID } from '@/lib/appwrite';
import { generateSUPIId, UserData } from '@/lib/supi';
import { encryptSecret, decryptSecret } from '@/lib/encryption';
import { Models, Query, OAuthProvider } from 'appwrite';

interface AuthContextType {
  user: Models.User<Models.Preferences> | null;
  userData: UserData | null;
  loading: boolean;
  loginWithEmail: (email: string) => Promise<void>;
  verifyOTP: (userId: string, secret: string, otp: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  connectWallet: (pin: string) => Promise<void>;
  addWallet: () => Promise<void>;
  setPrimaryWallet: (walletAddress: string) => Promise<void>;
  searchUsers: (query: string) => Promise<UserData[]>;
  verifyPin: (pin: string) => boolean;
  getPrimarySecret: () => Promise<string | null>;
  getWalletSecret: (walletAddress: string) => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();

    const handleAuthChange = () => {
      checkUser();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('appwrite-auth-change', handleAuthChange);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('appwrite-auth-change', handleAuthChange);
      }
    };
  }, []);

  async function checkUser() {
    try {
      const currentUser = await account.get();
      setUser(currentUser);
      await fetchUserData(currentUser.email);
    } catch (error) {
      setUser(null);
      setUserData(null);
    } finally {
      setLoading(false);
    }
  }

  async function fetchUserData(email: string) {
    try {
      const response = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID!,
        [Query.equal('email', email)]
      );

      if (response.documents.length > 0) {
        setUserData(response.documents[0] as any);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  }

  async function searchUsers(queryStr: string): Promise<UserData[]> {
    const q = queryStr.trim();
    if (!q) return [];

    try {
      const response = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID!,
        [
          Query.or([
            Query.contains('name', q),
            Query.contains('email', q),
            Query.equal('supid', q),
          ]),
          Query.limit(10),
        ]
      );

      return response.documents as any;
    } catch (err) {
      console.error('searchUsers error:', err);
      return [];
    }
  }

  async function loginWithEmail(email: string) {
    const token = await account.createEmailToken(ID.unique(), email.trim(), true);
    return token as any;
  }

  async function verifyOTP(userId: string, secret: string, otp: string) {
    await account.createSession({ userId, secret: otp.trim() });
    const currentUser = await account.get();
    setUser(currentUser);
    await fetchUserData(currentUser.email);
  }

  async function loginWithGoogle() {
    try {
      const redirectUrl = account.createOAuth2Token(
        OAuthProvider.Google,
        `${window.location.origin}/login/callback`,
        `${window.location.origin}/login`
      );

      if (typeof redirectUrl === 'string') {
        window.location.href = redirectUrl;
      }
    } catch (error) {
      console.error('OAuth error:', error);
    }
  }

  async function logout() {
    await account.deleteSession('current');
    setUser(null);
    setUserData(null);
  }

  async function connectWallet(pin: string) {
    if (!user) return;

    // Validate PIN format
    if (!/^\d{6}$/.test(pin)) {
      throw new Error('PIN must be exactly 6 digits');
    }

    try {
      // Create new wallet via API
      const response = await fetch('https://stellix-backend.vercel.app/api/wallet/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) throw new Error('Failed to create wallet');

      const result = await response.json();
      const { publicKey, secretKey } = result.data;

      // Encrypt the secret before storing
      const encryptedSecret = await encryptSecret(secretKey);

      const supid = generateSUPIId(user.email);
      const newUserData: UserData = {
        supid,
        walletAddresses: [publicKey],
        primaryWallet: publicKey,
        walletSecrets: [encryptedSecret],
        primarySecret: encryptedSecret,
        supi_pin: pin,
        email: user.email,
        dateCreated: new Date().toISOString(),
        pref: 'XLM',
        name: user.name || '',
      };

      await databases.createDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID!,
        ID.unique(),
        newUserData
      );
      setUserData(newUserData);
    } catch (error) {
      console.error('Error creating wallet:', error);
      throw error;
    }
  }

  async function addWallet() {
    if (!user || !userData) return;

    try {
      // Create new wallet via API
      const response = await fetch('https://stellix-backend.vercel.app/api/wallet/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) throw new Error('Failed to create wallet');

      const result = await response.json();
      const { publicKey, secretKey } = result.data;

      if (userData.walletAddresses.includes(publicKey)) {
        throw new Error('Wallet already exists');
      }

      // Encrypt the new wallet secret
      const encryptedSecret = await encryptSecret(secretKey);

      const updatedWallets = [...userData.walletAddresses, publicKey];
      const updatedSecrets = [...userData.walletSecrets, encryptedSecret];
      const updatedUserData: UserData = {
        ...userData,
        walletAddresses: updatedWallets,
        walletSecrets: updatedSecrets,
      };

      const response2 = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID!,
        [Query.equal('email', user.email)]
      );

      if (response2.documents.length > 0) {
        await databases.updateDocument(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID!,
          response2.documents[0].$id,
          { 
            walletAddresses: updatedWallets,
            walletSecrets: updatedSecrets
          }
        );
        setUserData(updatedUserData);
      }
    } catch (error) {
      console.error('Error adding wallet:', error);
      throw error;
    }
  }

  async function setPrimaryWallet(walletAddress: string) {
    if (!user || !userData) return;

    const walletIndex = userData.walletAddresses.indexOf(walletAddress);
    if (walletIndex === -1) {
      throw new Error('Wallet not found in your wallets');
    }

    const correspondingSecret = userData.walletSecrets[walletIndex];

    const updatedUserData: UserData = {
      ...userData,
      primaryWallet: walletAddress,
      primarySecret: correspondingSecret,
    };

    try {
      const response = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID!,
        [Query.equal('email', user.email)]
      );

      if (response.documents.length > 0) {
        await databases.updateDocument(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID!,
          response.documents[0].$id,
          { 
            primaryWallet: walletAddress,
            primarySecret: correspondingSecret
          }
        );
        setUserData(updatedUserData);
      }
    } catch (error) {
      console.error('Error setting primary wallet:', error);
      throw error;
    }
  }

  function verifyPin(pin: string): boolean {
    if (!userData?.supi_pin) {
      return false;
    }
    return userData.supi_pin === pin;
  }

  async function getPrimarySecret(): Promise<string | null> {
    if (!userData?.primarySecret) {
      console.error('No primarySecret found in userData');
      return null;
    }
    try {
      console.log('Attempting to decrypt primary secret...');
      const decrypted = await decryptSecret(userData.primarySecret);
      console.log('Successfully decrypted primary secret');
      return decrypted;
    } catch (error) {
      console.error('Error decrypting primary secret:', error);
      console.error('Encrypted value:', userData.primarySecret);
      return null;
    }
  }

  async function getWalletSecret(walletAddress: string): Promise<string | null> {
    if (!userData) return null;
    const walletIndex = userData.walletAddresses.indexOf(walletAddress);
    if (walletIndex === -1) return null;
    try {
      return await decryptSecret(userData.walletSecrets[walletIndex]);
    } catch (error) {
      console.error('Error decrypting wallet secret:', error);
      return null;
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        userData,
        loading,
        loginWithEmail,
        verifyOTP,
        loginWithGoogle,
        logout,
        connectWallet,
        addWallet,
        setPrimaryWallet,
        searchUsers,
        verifyPin,
        getPrimarySecret,
        getWalletSecret,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
