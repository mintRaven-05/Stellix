const StellarSdk = require('@stellar/stellar-sdk');
require('dotenv').config();

// Initialize Stellar Server
const getServer = () => {
  const horizonUrl = process.env.HORIZON_URL || 'https://horizon-testnet.stellar.org';
  return new StellarSdk.Horizon.Server(horizonUrl);
};

// Get network passphrase
const getNetworkPassphrase = () => {
  const network = (process.env.NETWORK || 'testnet').toLowerCase();
  return network === 'mainnet' 
    ? StellarSdk.Networks.PUBLIC 
    : StellarSdk.Networks.TESTNET;
};

// Create a new wallet (keypair)
const createWallet = () => {
  try {
    const pair = StellarSdk.Keypair.random();
    return {
      publicKey: pair.publicKey(),
      secretKey: pair.secret()
    };
  } catch (error) {
    throw new Error(`Failed to create wallet: ${error.message}`);
  }
};

// Get account details including balances and assets
const getAccountDetails = async (publicKey) => {
  try {
    const server = getServer();
    const account = await server.loadAccount(publicKey);
    
    return {
      accountId: account.accountId(),
      sequence: account.sequence,
      balances: account.balances.map(balance => ({
        assetType: balance.asset_type,
        assetCode: balance.asset_code || 'XLM',
        assetIssuer: balance.asset_issuer || null,
        balance: balance.balance,
        limit: balance.limit || null
      })),
      signers: account.signers,
      flags: account.flags
    };
  } catch (error) {
    if (error.response && error.response.status === 404) {
      throw new Error('Account not found. Account may not be funded yet.');
    }
    throw new Error(`Failed to fetch account details: ${error.message}`);
  }
};

// Search for assets on Stellar network
const searchAssets = async (assetCode, assetIssuer = null, limit = 20) => {
  try {
    const server = getServer();
    let assetsCall = server.assets().forCode(assetCode).limit(limit);
    
    if (assetIssuer) {
      assetsCall = assetsCall.forIssuer(assetIssuer);
    }
    
    const assets = await assetsCall.call();
    
    return assets.records.map(asset => ({
      assetType: asset.asset_type,
      assetCode: asset.asset_code,
      assetIssuer: asset.asset_issuer,
      numAccounts: asset.num_accounts,
      amount: asset.amount,
      flags: asset.flags
    }));
  } catch (error) {
    throw new Error(`Failed to search assets: ${error.message}`);
  }
};

// Add trustline to an asset
const addTrustline = async (secretKey, assetCode, assetIssuer, limit = null) => {
  try {
    const server = getServer();
    const sourceKeypair = StellarSdk.Keypair.fromSecret(secretKey);
    const sourcePublicKey = sourceKeypair.publicKey();
    
    // Load the source account
    const account = await server.loadAccount(sourcePublicKey);
    
    // Create the asset
    const asset = new StellarSdk.Asset(assetCode, assetIssuer);
    
    // Build the transaction
    const transaction = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: getNetworkPassphrase()
    })
      .addOperation(
        StellarSdk.Operation.changeTrust({
          asset: asset,
          limit: limit || undefined
        })
      )
      .setTimeout(30)
      .build();
    
    // Sign the transaction
    transaction.sign(sourceKeypair);
    
    // Submit the transaction
    const result = await server.submitTransaction(transaction);
    
    return {
      success: true,
      hash: result.hash,
      assetCode: assetCode,
      assetIssuer: assetIssuer,
      ledger: result.ledger
    };
  } catch (error) {
    throw new Error(`Failed to add trustline: ${error.message}`);
  }
};

// Swap assets using path payment (XLM to USDC or vice versa)
const swapAssets = async (
  secretKey,
  sourceAsset,
  sourceAmount,
  destinationAsset,
  destinationAmount,
  destinationAccount = null
) => {
  try {
    const server = getServer();
    const sourceKeypair = StellarSdk.Keypair.fromSecret(secretKey);
    const sourcePublicKey = sourceKeypair.publicKey();
    
    // If no destination account provided, use source account
    const destAccount = destinationAccount || sourcePublicKey;
    
    // Load the source account
    const account = await server.loadAccount(sourcePublicKey);
    
    // Create asset objects
    const sendAsset = sourceAsset.code === 'XLM' 
      ? StellarSdk.Asset.native() 
      : new StellarSdk.Asset(sourceAsset.code, sourceAsset.issuer);
    
    const destAsset = destinationAsset.code === 'XLM'
      ? StellarSdk.Asset.native()
      : new StellarSdk.Asset(destinationAsset.code, destinationAsset.issuer);
    
    // Build the transaction with path payment strict send
    const transaction = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: getNetworkPassphrase()
    })
      .addOperation(
        StellarSdk.Operation.pathPaymentStrictSend({
          sendAsset: sendAsset,
          sendAmount: sourceAmount,
          destination: destAccount,
          destAsset: destAsset,
          destMin: destinationAmount
        })
      )
      .setTimeout(30)
      .build();
    
    // Sign the transaction
    transaction.sign(sourceKeypair);
    
    // Submit the transaction
    const result = await server.submitTransaction(transaction);
    
    return {
      success: true,
      hash: result.hash,
      sourceAsset: sourceAsset,
      sourceAmount: sourceAmount,
      destinationAsset: destinationAsset,
      ledger: result.ledger
    };
  } catch (error) {
    throw new Error(`Failed to swap assets: ${error.message}`);
  }
};

// Find payment paths for swapping
const findPaymentPaths = async (
  sourceAccount,
  destinationAsset,
  destinationAmount,
  sourceAssets = null
) => {
  try {
    const server = getServer();
    
    const destAsset = destinationAsset.code === 'XLM'
      ? StellarSdk.Asset.native()
      : new StellarSdk.Asset(destinationAsset.code, destinationAsset.issuer);
    
    let pathsCall = server
      .strictReceivePaths(sourceAccount, destAsset, destinationAmount);
    
    const paths = await pathsCall.call();
    
    return paths.records.map(path => ({
      sourceAssetType: path.source_asset_type,
      sourceAssetCode: path.source_asset_code || 'XLM',
      sourceAssetIssuer: path.source_asset_issuer || null,
      sourceAmount: path.source_amount,
      destinationAssetType: path.destination_asset_type,
      destinationAssetCode: path.destination_asset_code || 'XLM',
      destinationAssetIssuer: path.destination_asset_issuer || null,
      destinationAmount: path.destination_amount,
      path: path.path.map(p => ({
        assetType: p.asset_type,
        assetCode: p.asset_code || 'XLM',
        assetIssuer: p.asset_issuer || null
      }))
    }));
  } catch (error) {
    throw new Error(`Failed to find payment paths: ${error.message}`);
  }
};

// Fund account on testnet (for testing purposes)
const fundTestnetAccount = async (publicKey) => {
  try {
    const network = (process.env.NETWORK || 'testnet').toLowerCase();
    if (network === 'mainnet') {
      throw new Error('Account funding is only available on testnet');
    }
    
    const response = await fetch(
      `https://friendbot.stellar.org?addr=${encodeURIComponent(publicKey)}`
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Friendbot request failed: ${errorText}`);
    }
    
    return {
      success: true,
      message: 'Account funded successfully with 10,000 XLM',
      publicKey: publicKey
    };
  } catch (error) {
    throw new Error(`Failed to fund account: ${error.message}`);
  }
};

module.exports = {
  createWallet,
  getAccountDetails,
  searchAssets,
  addTrustline,
  swapAssets,
  findPaymentPaths,
  fundTestnetAccount
};
