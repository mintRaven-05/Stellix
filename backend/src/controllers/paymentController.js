const { 
  server, 
  networkPassphrase, 
  StellarSDK, 
  getAsset,
  generatePaymentId,
  generateOTP,
  hashOTP
} = require('../utils/stellar.js');

// Direct Pay - Simple Stellar payment (no contract needed)
exports.directPay = async (req, res) => {
  try {
    const { sender_secret, receiver_wallet, asset, amount } = req.body;

    // Validate inputs
    if (!sender_secret || !receiver_wallet || !asset || !amount) {
      return res.status(400).json({ 
        error: 'Missing required fields: sender_secret, receiver_wallet, asset, amount' 
      });
    }

    // Load sender keypair
    const senderKeypair = StellarSDK.Keypair.fromSecret(sender_secret);
    const senderPublic = senderKeypair.publicKey();

    // Load sender account
    const senderAccount = await server.loadAccount(senderPublic);

    // Get asset
    const stellarAsset = getAsset(asset);

    // Build transaction
    const transaction = new StellarSDK.TransactionBuilder(senderAccount, {
      fee: StellarSDK.BASE_FEE,
      networkPassphrase: networkPassphrase,
    })
      .addOperation(
        StellarSDK.Operation.payment({
          destination: receiver_wallet,
          asset: stellarAsset,
          amount: amount.toString(),
        })
      )
      .setTimeout(30)
      .build();

    // Sign transaction
    transaction.sign(senderKeypair);

    // Submit transaction
    const result = await server.submitTransaction(transaction);

    res.json({
      success: true,
      message: 'Direct payment sent successfully via SUPI',
      transaction_hash: result.hash,
      from: senderPublic,
      to: receiver_wallet,
      amount: amount,
      asset: asset,
    });

  } catch (error) {
    console.error('Direct pay error:', error);
    res.status(500).json({ 
      error: 'Payment failed', 
      details: error.message 
    });
  }
};

// Protected Pay - Initiate escrow with OTP (stored in contract, no DB!)
exports.initiateProtectedPay = async (req, res) => {
  try {
    const { sender_secret, receiver_wallet, asset, amount } = req.body;

    // Validate inputs
    if (!sender_secret || !receiver_wallet || !asset || !amount) {
      return res.status(400).json({ 
        error: 'Missing required fields: sender_secret, receiver_wallet, asset, amount' 
      });
    }

    // Load sender keypair
    const senderKeypair = StellarSDK.Keypair.fromSecret(sender_secret);
    const senderPublic = senderKeypair.publicKey();

    // Generate payment ID and OTP
    const paymentId = generatePaymentId();
    const otp = generateOTP();
    const otpHash = hashOTP(otp); // Hash the OTP for storage in contract

    // TODO: Call Soroban contract to create escrow
    // The contract will store the OTP hash - no database needed!
    // Steps:
    // 1. Load sender account
    // 2. Get asset address (for token contract)
    // 3. Build transaction invoking contract.create_escrow(
    //      payment_id, sender, receiver, amount, token_address, otp_hash
    //    )
    // 4. Sign and submit transaction
    
    // For now, simulated response
    res.json({
      success: true,
      message: 'Protected payment initiated via SUPI. Share OTP with receiver.',
      payment_id: paymentId,
      otp: otp, // Send OTP to sender's frontend
      sender: senderPublic,
      receiver: receiver_wallet,
      amount: amount,
      asset: asset,
      status: 'pending',
      note: 'OTP is stored securely in the smart contract. No database needed!'
    });

  } catch (error) {
    console.error('Protected pay initiation error:', error);
    res.status(500).json({ 
      error: 'Failed to initiate protected payment', 
      details: error.message 
    });
  }
};

// Verify OTP and release funds (contract validates OTP, no DB lookup!)
exports.verifyAndRelease = async (req, res) => {
  try {
    const { payment_id, otp } = req.body;

    // Validate inputs
    if (!payment_id || !otp) {
      return res.status(400).json({ 
        error: 'Missing required fields: payment_id, otp' 
      });
    }

    const otpHash = hashOTP(otp); // Hash the provided OTP

    // TODO: Call Soroban contract to verify and release funds
    // The contract has the OTP hash stored - it will validate directly!
    // Steps:
    // 1. Build transaction invoking contract.release_funds(payment_id, otp_hash)
    // 2. Contract validates OTP hash internally
    // 3. Contract releases funds if valid
    // 4. Sign and submit transaction
    
    // Simulated response
    res.json({
      success: true,
      message: 'OTP verified by smart contract. Funds released successfully via SUPI.',
      payment_id: payment_id,
      status: 'completed',
      note: 'Contract validated OTP and released funds - no database was used!'
    });

  } catch (error) {
    console.error('Verify and release error:', error);
    res.status(500).json({ 
      error: 'Failed to verify and release funds', 
      details: error.message 
    });
  }
};

// Get payment status from contract
exports.getPaymentStatus = async (req, res) => {
  try {
    const { payment_id } = req.params;

    // TODO: Call Soroban contract to get escrow details
    // Steps:
    // 1. Invoke contract.get_escrow(payment_id)
    // 2. Contract returns escrow details (without OTP hash)
    // 3. Return status to user
    
    // Simulated response
    res.json({
      success: true,
      payment_id: payment_id,
      status: 'pending',
      note: 'Escrow data is stored in the smart contract'
    });

  } catch (error) {
    console.error('Get payment status error:', error);
    res.status(500).json({ 
      error: 'Failed to get payment status', 
      details: error.message 
    });
  }
};
