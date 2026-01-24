const StellarSDK = require('@stellar/stellar-sdk');
require('dotenv').config();

const server = new StellarSDK.Horizon.Server(process.env.HORIZON_URL);
const networkPassphrase = process.env.NETWORK === 'testnet' 
  ? StellarSDK.Networks.TESTNET 
  : StellarSDK.Networks.PUBLIC;

// Asset mapping helper
function getAsset(assetCode) {
  if (assetCode === 'XLM' || assetCode === 'native') {
    return StellarSDK.Asset.native();
  }
  
  // Common testnet assets - update with actual issuers
  const assetIssuers = {
    'USDC': 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5', // Example issuer
    // Add more assets as needed
  };
  
  const issuer = assetIssuers[assetCode];
  if (!issuer) {
    throw new Error(`Unknown asset: ${assetCode}`);
  }
  
  return new StellarSDK.Asset(assetCode, issuer);
}

// Generate random payment ID
function generatePaymentId() {
  return 'SUPI_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Generate random 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Simple hash function for OTP (use proper hashing in production)
function hashOTP(otp) {
  // In production, use a proper cryptographic hash like SHA-256
  // For now, simple hash (you can improve this)
  return 'HASH_' + otp;
}

module.exports = {
  server,
  networkPassphrase,
  StellarSDK,
  getAsset,
  generatePaymentId,
  generateOTP,
  hashOTP
};
