const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');

// Get global transaction history for a wallet
router.get('/history/global/:publicKey', transactionController.getGlobalHistory);

// Get P2P transaction history between two wallets
router.get('/history/p2p/:wallet1/:wallet2', transactionController.getP2PHistory);

// Get transaction statistics for a wallet
router.get('/stats/:publicKey', transactionController.getStats);

// Get single transaction details by hash
router.get('/details/:hash', transactionController.getTransactionDetail);

module.exports = router;
