
const { 
  server, 
  networkPassphrase, 
  StellarSDK,
  getAsset,
  getTokenContractAddress,
  generatePaymentId,
  generateOTP,
  hashOTP
} = require('../utils/stellar.js');

// Import from the latest SDK structure
const { Contract, rpc, scValToNative, nativeToScVal } = StellarSDK;

// In latest SDK, SorobanRpc is now called 'rpc'
const SorobanRpc = rpc;

// Log to verify imports worked
console.log('SorobanRpc (rpc):', typeof SorobanRpc);
console.log('Contract:', typeof Contract);
console.log('SorobanRpc.Server:', typeof SorobanRpc?.Server);

// Helper function to validate contract ID
function validateContractId(contractId) {
  if (!contractId) {
    throw new Error('CONTRACT_ID not set in .env file');
  }
  
  if (!contractId.startsWith('C') || contractId.length !== 56) {
    throw new Error(`Invalid CONTRACT_ID format: ${contractId}`);
  }
  
  return contractId;
}

// Direct Pay - Simple Stellar payment (no contract needed)
exports.directPay = async (req, res) => {
  try {
    const { sender_secret, receiver_wallet, asset, amount } = req.body;

    if (!sender_secret || !receiver_wallet || !asset || !amount) {
      return res.status(400).json({ 
        error: 'Missing required fields: sender_secret, receiver_wallet, asset, amount' 
      });
    }

    const senderKeypair = StellarSDK.Keypair.fromSecret(sender_secret);
    const senderPublic = senderKeypair.publicKey();
    const senderAccount = await server.loadAccount(senderPublic);
    const stellarAsset = getAsset(asset);

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

    transaction.sign(senderKeypair);
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

// Protected Pay - Initiate escrow with OTP
exports.initiateProtectedPay = async (req, res) => {
  try {
    const { sender_secret, receiver_wallet, asset, amount, asset_issuer } = req.body;

    if (!sender_secret || !receiver_wallet || !asset || !amount) {
      return res.status(400).json({ 
        error: 'Missing required fields: sender_secret, receiver_wallet, asset, amount' 
      });
    }

    const senderKeypair = StellarSDK.Keypair.fromSecret(sender_secret);
    const senderPublic = senderKeypair.publicKey();

    const paymentId = generatePaymentId();
    const otp = generateOTP();
    const otpHash = hashOTP(otp);

    console.log('=== Protected Pay Details ===');
    console.log('Payment ID:', paymentId);
    console.log('OTP:', otp);
    console.log('OTP Hash:', otpHash);

    const tokenAddress = getTokenContractAddress(asset, asset_issuer);
    console.log('Token Address:', tokenAddress);

    const senderAccount = await server.loadAccount(senderPublic);

    const contractId = validateContractId(process.env.CONTRACT_ID);
    console.log('Contract ID:', contractId);

    const contract = new Contract(contractId);
    const amountInStroops = Math.floor(parseFloat(amount) * 10000000);

    console.log('Amount in stroops:', amountInStroops);

    const transaction = new StellarSDK.TransactionBuilder(senderAccount, {
      fee: '100000',
      networkPassphrase: networkPassphrase,
    })
      .addOperation(
        contract.call(
          'create_escrow',
          nativeToScVal(paymentId, { type: 'string' }),
          nativeToScVal(senderPublic, { type: 'address' }),
          nativeToScVal(receiver_wallet, { type: 'address' }),
          nativeToScVal(amountInStroops, { type: 'i128' }),
          nativeToScVal(tokenAddress, { type: 'address' }),
          nativeToScVal(otpHash, { type: 'string' })
        )
      )
      .setTimeout(30)
      .build();

    transaction.sign(senderKeypair);

    const sorobanServer = new SorobanRpc.Server(process.env.SOROBAN_RPC_URL);
    
    console.log('Simulating transaction...');
    const simulateResponse = await sorobanServer.simulateTransaction(transaction);
    
    if (SorobanRpc.Api.isSimulationError(simulateResponse)) {
      console.error('Simulation failed:', simulateResponse);
      return res.status(400).json({ 
        error: 'Simulation failed', 
        details: simulateResponse.error 
      });
    }

    console.log('Simulation successful');

    // Assemble the transaction
    let preparedTransaction;
    try {
      preparedTransaction = SorobanRpc.assembleTransaction(transaction, simulateResponse);
    } catch (e) {
      console.error('Assembly error:', e);
      return res.status(400).json({
        error: 'Failed to assemble transaction',
        details: e.message
      });
    }

    console.log('Transaction assembled, type:', typeof preparedTransaction);
    console.log('Has sign method:', typeof preparedTransaction.sign);

    // The assembled transaction needs to be built first in newer SDK versions
    let finalTransaction;
    if (typeof preparedTransaction.build === 'function') {
      finalTransaction = preparedTransaction.build();
      finalTransaction.sign(senderKeypair);
    } else if (typeof preparedTransaction.sign === 'function') {
      preparedTransaction.sign(senderKeypair);
      finalTransaction = preparedTransaction;
    } else {
      // If it's already a built transaction
      finalTransaction = preparedTransaction;
      if (finalTransaction.toXDR) {
        // Re-create from XDR and sign
        const xdr = finalTransaction.toXDR();
        finalTransaction = new StellarSDK.TransactionBuilder.fromXDR(xdr, networkPassphrase);
        if (typeof finalTransaction.sign === 'function') {
          finalTransaction.sign(senderKeypair);
        }
      }
    }

    console.log('Submitting transaction...');
    const sendResponse = await sorobanServer.sendTransaction(finalTransaction);
    
    if (sendResponse.status === 'ERROR') {
      console.error('Submit failed:', sendResponse);
      return res.status(400).json({ 
        error: 'Transaction failed', 
        details: sendResponse 
      });
    }

    console.log('Transaction submitted, hash:', sendResponse.hash);

    let getResponse = await sorobanServer.getTransaction(sendResponse.hash);
    let attempts = 0;
    
    while (getResponse.status === 'NOT_FOUND' && attempts < 10) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      getResponse = await sorobanServer.getTransaction(sendResponse.hash);
      attempts++;
      console.log(`Attempt ${attempts}/10: ${getResponse.status}`);
    }

    if (getResponse.status === 'SUCCESS') {
      console.log('Transaction successful!');
      res.json({
        success: true,
        message: 'Protected payment initiated via SUPI. Share OTP with receiver.',
        payment_id: paymentId,
        otp: otp,
        sender: senderPublic,
        receiver: receiver_wallet,
        amount: amount,
        asset: asset,
        token_contract: tokenAddress,
        transaction_hash: sendResponse.hash,
        status: 'pending',
        note: 'Funds are now locked in smart contract. OTP stored securely on-chain!'
      });
    } else {
      console.error('Transaction failed:', getResponse);
      res.status(400).json({ 
        error: 'Transaction failed', 
        status: getResponse.status 
      });
    }

  } catch (error) {
    console.error('Protected pay initiation error:', error);
    res.status(500).json({ 
      error: 'Failed to initiate protected payment', 
      details: error.message 
    });
  }
};

// Verify OTP and release funds
exports.verifyAndRelease = async (req, res) => {
  try {
    const { payment_id, otp, receiver_secret } = req.body;

    if (!payment_id || !otp || !receiver_secret) {
      return res.status(400).json({ 
        error: 'Missing required fields: payment_id, otp, receiver_secret' 
      });
    }

    const otpHash = hashOTP(otp);
    const contractId = validateContractId(process.env.CONTRACT_ID);
    const receiverKeypair = StellarSDK.Keypair.fromSecret(receiver_secret);
    const account = await server.loadAccount(receiverKeypair.publicKey());
    const contract = new Contract(contractId);

    const transaction = new StellarSDK.TransactionBuilder(account, {
      fee: '100000',
      networkPassphrase: networkPassphrase,
    })
      .addOperation(
        contract.call(
          'release_funds',
          nativeToScVal(payment_id, { type: 'string' }),
          nativeToScVal(otpHash, { type: 'string' })
        )
      )
      .setTimeout(30)
      .build();

    transaction.sign(receiverKeypair);

    const sorobanServer = new SorobanRpc.Server(process.env.SOROBAN_RPC_URL);
    const simulateResponse = await sorobanServer.simulateTransaction(transaction);
    
    if (SorobanRpc.Api.isSimulationError(simulateResponse)) {
      return res.status(400).json({ 
        error: 'OTP verification failed', 
        details: simulateResponse.error 
      });
    }

    // Assemble the transaction
    let preparedTransaction = SorobanRpc.assembleTransaction(transaction, simulateResponse);

    // Handle different SDK versions
    let finalTransaction;
    if (typeof preparedTransaction.build === 'function') {
      finalTransaction = preparedTransaction.build();
      finalTransaction.sign(receiverKeypair);
    } else if (typeof preparedTransaction.sign === 'function') {
      preparedTransaction.sign(receiverKeypair);
      finalTransaction = preparedTransaction;
    } else {
      finalTransaction = preparedTransaction;
    }

    const sendResponse = await sorobanServer.sendTransaction(finalTransaction);
    
    if (sendResponse.status === 'ERROR') {
      return res.status(400).json({ 
        error: 'Transaction failed', 
        details: sendResponse 
      });
    }

    let getResponse = await sorobanServer.getTransaction(sendResponse.hash);
    let attempts = 0;
    
    while (getResponse.status === 'NOT_FOUND' && attempts < 10) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      getResponse = await sorobanServer.getTransaction(sendResponse.hash);
      attempts++;
    }

    if (getResponse.status === 'SUCCESS') {
      res.json({
        success: true,
        message: 'OTP verified by smart contract. Funds released successfully!',
        payment_id: payment_id,
        receiver: receiverKeypair.publicKey(),
        transaction_hash: sendResponse.hash,
        status: 'completed',
        note: 'Contract validated OTP and released funds automatically!'
      });
    } else {
      res.status(400).json({ 
        error: 'Verification failed', 
        status: getResponse.status,
        details: 'Invalid OTP or transaction error'
      });
    }

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

    const contractId = validateContractId(process.env.CONTRACT_ID);
    const contract = new Contract(contractId);

    const tempKeypair = StellarSDK.Keypair.random();
    const tempAccount = await server.loadAccount(tempKeypair.publicKey()).catch(() => {
      return new StellarSDK.Account(tempKeypair.publicKey(), '0');
    });

    const transaction = new StellarSDK.TransactionBuilder(tempAccount, {
      fee: '100000',
      networkPassphrase: networkPassphrase,
    })
      .addOperation(
        contract.call(
          'get_escrow',
          nativeToScVal(payment_id, { type: 'string' })
        )
      )
      .setTimeout(30)
      .build();

    const sorobanServer = new SorobanRpc.Server(process.env.SOROBAN_RPC_URL);
    const simulateResponse = await sorobanServer.simulateTransaction(transaction);
    
    if (SorobanRpc.Api.isSimulationError(simulateResponse)) {
      return res.status(404).json({ 
        error: 'Payment not found', 
        details: simulateResponse.error 
      });
    }

    const result = simulateResponse.result?.retval;
    if (result) {
      const escrowData = scValToNative(result);
      
      res.json({
        success: true,
        payment_id: payment_id,
        sender: escrowData[0],
        receiver: escrowData[1],
        amount: (escrowData[2] / 10000000).toString(),
        is_active: escrowData[3],
        timestamp: escrowData[4],
        status: escrowData[3] ? 'pending' : 'completed',
        note: 'Data retrieved from smart contract'
      });
    } else {
      res.status(404).json({ error: 'Payment not found' });
    }

  } catch (error) {
    console.error('Get payment status error:', error);
    res.status(500).json({ 
      error: 'Failed to get payment status', 
      details: error.message 
    });
  }
}
