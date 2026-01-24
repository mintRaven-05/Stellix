const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const paymentRoutes = require('./routes/payment');
const walletRoutes = require('./routes/wallet');
const transactionRoutes = require('./routes/transaction');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.use('/api/payment', paymentRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/transaction', transactionRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'SUPI Backend is running',
    network: process.env.NETWORK,
    description: 'Stellar UPI - No Database Needed!'
  });
});

// Root route
app.get('/', (req, res) => {
  res.json({
    project: 'SUPI',
    description: 'Stellar UPI Payment System with Wallet Management',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      // Payment endpoints
      directPay: 'POST /api/payment/directPay',
      protectedPayInitiate: 'POST /api/payment/protectedPay/initiate',
      protectedPayVerify: 'POST /api/payment/protectedPay/verify',
      paymentStatus: 'GET /api/payment/protectedPay/status/:payment_id',
      // Wallet endpoints
      createWallet: 'POST /api/wallet/create',
      walletDetails: 'GET /api/wallet/details/:publicKey',
      searchAssets: 'GET /api/wallet/assets/search?assetCode=USDC&assetIssuer=xxx&limit=20',
      addAsset: 'POST /api/wallet/assets/add',
      swapAssets: 'POST /api/wallet/swap',
      findSwapPaths: 'GET /api/wallet/swap/paths',
      fundTestAccount: 'POST /api/wallet/fund',
      // Transaction endpoints
      globalHistory: 'GET /api/transaction/history/global/:publicKey',
      p2pHistory: 'GET /api/transaction/history/p2p/:wallet1/:wallet2',
      transactionStats: 'GET /api/transaction/stats/:publicKey',
      transactionDetails: 'GET /api/transaction/details/:hash'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!', 
    details: err.message 
  });
});

app.listen(PORT, () => {
  console.log(`
  ========================================
  SUPI Backend Server Running
  ========================================
  Port: ${PORT}
  Network: ${process.env.NETWORK || 'TESTNET'}
  
  API Endpoints:
  - Root: http://localhost:${PORT}/
  - Health: http://localhost:${PORT}/health
  - Payment APIs: http://localhost:${PORT}/api/payment/*
  - Wallet APIs: http://localhost:${PORT}/api/wallet/*
  - Transaction APIs: http://localhost:${PORT}/api/transaction/*
  ========================================
  `);
});

// Export for Vercel
module.exports = app;
