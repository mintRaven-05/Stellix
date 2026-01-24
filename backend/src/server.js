const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const paymentRoutes = require('./routes/payment');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.use('/api/payment', paymentRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'SUPI Backend is running',
    network: process.env.NETWORK,
    description: 'Stellar UPI'
  });
});

// Root route
app.get('/', (req, res) => {
  res.json({
    project: 'SUPI',
    description: 'Stellar UPI Payment System',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      directPay: 'POST /api/payment/directPay',
      protectedPayInitiate: 'POST /api/payment/protectedPay/initiate',
      protectedPayVerify: 'POST /api/payment/protectedPay/verify',
      paymentStatus: 'GET /api/payment/protectedPay/status/:payment_id'
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
Backend running on localhost:3000
  `);
});
