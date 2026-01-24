const {
  createWallet,
  getAccountDetails,
  searchAssets,
  addTrustline,
  swapAssets,
  findPaymentPaths,
  fundTestnetAccount
} = require('../utils/walletHelper');

// Create a new wallet
exports.createNewWallet = async (req, res) => {
  try {
    const wallet = createWallet();

    res.json({
      success: true,
      message: 'Wallet created successfully',
      data: {
        publicKey: wallet.publicKey,
        secretKey: wallet.secretKey
      },
      warning: 'Store your secret key securely. Never share it with anyone!'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to create wallet',
      details: error.message
    });
  }
};

// Get wallet details (account info and balances)
exports.getWalletDetails = async (req, res) => {
  try {
    const { publicKey } = req.params;

    if (!publicKey) {
      return res.status(400).json({
        success: false,
        error: 'Public key is required'
      });
    }

    const accountDetails = await getAccountDetails(publicKey);

    res.json({
      success: true,
      data: accountDetails
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch wallet details',
      details: error.message
    });
  }
};

// Search for assets on Stellar network
exports.searchForAssets = async (req, res) => {
  try {
    const { assetCode, assetIssuer, limit } = req.query;

    if (!assetCode) {
      return res.status(400).json({
        success: false,
        error: 'Asset code is required'
      });
    }

    const assets = await searchAssets(
      assetCode, 
      assetIssuer || null, 
      parseInt(limit) || 20
    );

    res.json({
      success: true,
      count: assets.length,
      data: assets
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to search assets',
      details: error.message
    });
  }
};

// Add asset to wallet (create trustline)
exports.addAssetToWallet = async (req, res) => {
  try {
    const { secretKey, assetCode, assetIssuer, limit } = req.body;

    if (!secretKey || !assetCode || !assetIssuer) {
      return res.status(400).json({
        success: false,
        error: 'Secret key, asset code, and asset issuer are required'
      });
    }

    const result = await addTrustline(secretKey, assetCode, assetIssuer, limit);

    res.json({
      success: true,
      message: 'Asset added to wallet successfully',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to add asset to wallet',
      details: error.message
    });
  }
};

// Swap assets
exports.swapWalletAssets = async (req, res) => {
  try {
    const {
      secretKey,
      sourceAsset,
      sourceAmount,
      destinationAsset,
      destinationAmount,
      destinationAccount
    } = req.body;

    if (!secretKey || !sourceAsset || !sourceAmount || !destinationAsset || !destinationAmount) {
      return res.status(400).json({
        success: false,
        error: 'Required fields: secretKey, sourceAsset (code, issuer), sourceAmount, destinationAsset (code, issuer), destinationAmount'
      });
    }

    const result = await swapAssets(
      secretKey,
      sourceAsset,
      sourceAmount,
      destinationAsset,
      destinationAmount,
      destinationAccount || null
    );

    res.json({
      success: true,
      message: 'Assets swapped successfully',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to swap assets',
      details: error.message
    });
  }
};

// Find payment paths for swapping
exports.findSwapPaths = async (req, res) => {
  try {
    const { 
      sourceAccount, 
      destinationAsset, 
      destinationAmount 
    } = req.query;

    if (!sourceAccount || !destinationAsset || !destinationAmount) {
      return res.status(400).json({
        success: false,
        error: 'Required query params: sourceAccount, destinationAsset (as JSON), destinationAmount'
      });
    }

    // Parse destinationAsset from JSON string
    let destAsset;
    try {
      destAsset = JSON.parse(destinationAsset);
    } catch (e) {
      return res.status(400).json({
        success: false,
        error: 'destinationAsset must be a valid JSON object with code and issuer'
      });
    }

    const paths = await findPaymentPaths(
      sourceAccount,
      destAsset,
      destinationAmount
    );

    res.json({
      success: true,
      count: paths.length,
      data: paths
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to find payment paths',
      details: error.message
    });
  }
};

// Fund testnet account (for testing only)
exports.fundTestAccount = async (req, res) => {
  try {
    const { publicKey } = req.body;

    if (!publicKey) {
      return res.status(400).json({
        success: false,
        error: 'Public key is required'
      });
    }

    const result = await fundTestnetAccount(publicKey);

    res.json({
      success: true,
      message: result.message,
      data: {
        publicKey: result.publicKey
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fund account',
      details: error.message
    });
  }
};

module.exports = exports;
