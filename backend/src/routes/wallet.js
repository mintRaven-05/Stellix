const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');

// Create a new wallet
router.post('/create', walletController.createNewWallet);

// Get wallet details by public key
router.get('/details/:publicKey', walletController.getWalletDetails);

// Search for assets on Stellar network
router.get('/assets/search', walletController.searchForAssets);

// Add asset to wallet (create trustline)
router.post('/assets/add', walletController.addAssetToWallet);

// Swap assets
router.post('/swap', walletController.swapWalletAssets);

// Find payment paths for swapping
router.get('/swap/paths', walletController.findSwapPaths);

// Fund testnet account (testnet only)
router.post('/fund', walletController.fundTestAccount);

module.exports = router;
