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
    'INRPC':'GAJ5ADKESGK3S5VRRUWCONMCRSAUIY4HN3DUVJAFBPA2S67B7DQRCJFV',
    'INRC': 'GCI7I35SFSWG7U5RMUBZB5BTYSDIEDNAENEPA4CXNNTNXOHNFS4KS63L'
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
function getTokenContractAddress(assetCode, assetIssuer) {
  if (assetCode === 'XLM' || assetCode === 'native' || !assetIssuer) {
    // For native XLM, return the native contract address
    return 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC';
  }
  
  // For other assets, derive the contract address from asset code and issuer
  // This uses Stellar's Asset Contract
  const asset = new StellarSDK.Asset(assetCode, assetIssuer);
  const contractAddress = StellarSDK.Address.fromAsset(asset).toString();
  
  return contractAddress;
}

module.exports = {
  server,
  networkPassphrase,
  StellarSDK,
  getAsset,
  generatePaymentId,
  generateOTP,
  hashOTP,
  getTokenContractAddress
};
