const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

// Direct payment route
router.post('/directPay', paymentController.directPay);

// Protected payment routes
router.post('/protectedPay/initiate', paymentController.initiateProtectedPay);
router.post('/protectedPay/verify', paymentController.verifyAndRelease);
router.get('/protectedPay/status/:payment_id', paymentController.getPaymentStatus);

module.exports = router;
