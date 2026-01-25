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

const { Client, Databases, Query } = require('node-appwrite');

// Import from the latest SDK structure
const { Contract, rpc, scValToNative, nativeToScVal } = StellarSDK;

// In latest SDK, SorobanRpc is now called 'rpc'
const SorobanRpc = rpc;

// Log to verify imports worked
console.log('SorobanRpc (rpc):', typeof SorobanRpc);
console.log('Contract:', typeof Contract);
console.log('SorobanRpc.Server:', typeof SorobanRpc?.Server);

// Initialize Appwrite Client
const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);

// Appwrite Database Configuration
const DATABASE_ID = '696fcc4f0028e9c4a222';
const PEEPS_COLLECTION_ID = '696fcc5900009b09eaab';
const ESCROW_METADATA_COLLECTION_ID = 'escrow_metadata'; // You'll need to create this collection

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

// Helper function to get receiver's default asset from Appwrite
async function getReceiverDefaultAsset(receiverWallet) {
  try {
    console.log('Fetching receiver default asset for:', receiverWallet);
    
    const response = await databases.listDocuments(
      DATABASE_ID,
      PEEPS_COLLECTION_ID,
      [Query.equal('primaryWallet', receiverWallet)]
    );

    if (response.documents.length === 0) {
      console.log('No user found with wallet:', receiverWallet);
      return null;
    }

    const userData = response.documents[0];
    const defaultAsset = userData.pref; // Assuming 'pref' contains the default asset code
    
    console.log('Receiver default asset:', defaultAsset);
    return defaultAsset;

  } catch (error) {
    console.error('Error fetching receiver default asset:', error);
    throw new Error(`Failed to fetch receiver preferences: ${error.message}`);
  }
}

// Helper function to store escrow metadata in Appwrite
async function storeEscrowMetadata(paymentId, metadata) {
  try {
    console.log('Storing escrow metadata for payment:', paymentId);
    
    const document = await databases.createDocument(
      DATABASE_ID,
      ESCROW_METADATA_COLLECTION_ID,
      paymentId, // Use payment_id as document ID for easy lookup
      metadata
    );

    console.log('Escrow metadata stored successfully');
    return document;

  } catch (error) {
    console.error('Error storing escrow metadata:', error);
    throw new Error(`Failed to store escrow metadata: ${error.message}`);
  }
}

// Helper function to get escrow metadata from Appwrite
async function getEscrowMetadata(paymentId) {
  try {
    console.log('Fetching escrow metadata for payment:', paymentId);
    
    const document = await databases.getDocument(
      DATABASE_ID,
      ESCROW_METADATA_COLLECTION_ID,
      paymentId
    );

    console.log('Escrow metadata retrieved:', document);
    return document;

  } catch (error) {
    console.error('Error fetching escrow metadata:', error);
    throw new Error(`Failed to fetch escrow metadata: ${error.message}`);
  }
}

// Helper function to delete escrow metadata after successful release
async function deleteEscrowMetadata(paymentId) {
  try {
    await databases.deleteDocument(
      DATABASE_ID,
      ESCROW_METADATA_COLLECTION_ID,
      paymentId
    );
    console.log('Escrow metadata deleted for payment:', paymentId);
  } catch (error) {
    console.error('Error deleting escrow metadata:', error);
    // Don't throw - this is cleanup, shouldn't fail the main operation
  }
}

// Helper function to find asset issuer from Stellar network
async function findAssetIssuer(assetCode) {
  try {
    // For native XLM, no issuer needed
    if (assetCode === 'XLM' || assetCode === 'native') {
      return null;
    }

    // Check if it's a known testnet asset
    const knownAssets = {
      'USDC': 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
      'INRPC': process.env.INRPC_ISSUER || null,
      // Add more known assets here
    };

    if (knownAssets[assetCode]) {
      return knownAssets[assetCode];
    }

    // Search for the asset on Stellar network
    const assetsResponse = await server.assets()
      .forCode(assetCode)
      .limit(1)
      .call();

    if (assetsResponse.records.length > 0) {
      return assetsResponse.records[0].asset_issuer;
    }

    throw new Error(`Asset issuer not found for ${assetCode}`);
  } catch (error) {
    console.error(`Error finding issuer for ${assetCode}:`, error);
    throw error;
  }
}

// Helper function to perform asset swap using path payment
async function performSwap(senderKeypair, sourceAsset, sourceAmount, destAsset, receiverWallet) {
  try {
    console.log('=== Performing Swap ===');
    console.log('Source Asset:', sourceAsset);
    console.log('Source Amount:', sourceAmount);
    console.log('Destination Asset:', destAsset);
    console.log('Receiver:', receiverWallet);

    const senderPublic = senderKeypair.publicKey();
    const senderAccount = await server.loadAccount(senderPublic);

    // Get asset objects
    let stellarSourceAsset, stellarDestAsset;
    
    if (sourceAsset.code === 'XLM' || sourceAsset.code === 'native' || !sourceAsset.issuer) {
      stellarSourceAsset = StellarSDK.Asset.native();
    } else {
      stellarSourceAsset = new StellarSDK.Asset(sourceAsset.code, sourceAsset.issuer);
    }
    
    if (destAsset.code === 'XLM' || destAsset.code === 'native' || !destAsset.issuer) {
      stellarDestAsset = StellarSDK.Asset.native();
    } else {
      stellarDestAsset = new StellarSDK.Asset(destAsset.code, destAsset.issuer);
    }

    // Find payment paths
    const pathsResponse = await server.strictSendPaths(
      stellarSourceAsset,
      sourceAmount,
      [stellarDestAsset]
    )
    .limit(1)
    .call();

    if (!pathsResponse.records || pathsResponse.records.length === 0) {
      throw new Error(`No payment path found from ${sourceAsset.code} to ${destAsset.code}. Ensure liquidity pools exist.`);
    }

    const path = pathsResponse.records[0];
    const destinationAmount = path.destination_amount;

    console.log('Path found! Destination amount:', destinationAmount);

    // Calculate destMin with proper decimal handling (max 7 decimals)
    const destMinValue = parseFloat(destinationAmount) * 0.95; // 5% slippage
    const destMin = destMinValue.toFixed(7); // Max 7 decimals for Stellar

    console.log('Destination min amount:', destMin);

    // Build path payment strict send operation
    const transaction = new StellarSDK.TransactionBuilder(senderAccount, {
      fee: StellarSDK.BASE_FEE,
      networkPassphrase: networkPassphrase,
    })
      .addOperation(
        StellarSDK.Operation.pathPaymentStrictSend({
          sendAsset: stellarSourceAsset,
          sendAmount: sourceAmount.toString(),
          destination: receiverWallet,
          destAsset: stellarDestAsset,
          destMin: destMin,
          path: path.path.map(p => {
            if (p.asset_type === 'native') {
              return StellarSDK.Asset.native();
            }
            return new StellarSDK.Asset(p.asset_code, p.asset_issuer);
          })
        })
      )
      .setTimeout(30)
      .build();

    transaction.sign(senderKeypair);
    const result = await server.submitTransaction(transaction);

    console.log('Swap successful!');
    return {
      success: true,
      transaction_hash: result.hash,
      source_amount: sourceAmount,
      source_asset: sourceAsset.code,
      destination_amount: destinationAmount,
      destination_asset: destAsset.code
    };

  } catch (error) {
    console.error('Swap error:', error);
    throw error;
  }
}

// Direct Pay with Auto-Swap - Enhanced version
exports.directPay = async (req, res) => {
  try {
    const { senderSecret, AssetCode, AssetAmount, recieverWallet } = req.body;

    // Validation
    if (!senderSecret || !AssetCode || !AssetAmount || !recieverWallet) {
      return res.status(400).json({ 
        error: 'Missing required fields: senderSecret, AssetCode, AssetAmount, recieverWallet' 
      });
    }

    const senderKeypair = StellarSDK.Keypair.fromSecret(senderSecret);
    const senderPublic = senderKeypair.publicKey();

    // Step 1: Fetch receiver's default asset from Appwrite
    let receiverDefaultAsset;
    try {
      receiverDefaultAsset = await getReceiverDefaultAsset(recieverWallet);
    } catch (error) {
      return res.status(400).json({
        error: 'Failed to fetch receiver preferences',
        details: error.message,
        note: 'Make sure the receiver wallet is registered in the Peeps table'
      });
    }

    // If no preference found, use the sender's asset (no swap)
    if (!receiverDefaultAsset) {
      console.log('No receiver preference found, sending in original asset');
      receiverDefaultAsset = AssetCode;
    }

    console.log('=== Direct Pay with Auto-Swap ===');
    console.log('Sender Asset:', AssetCode);
    console.log('Receiver Default Asset:', receiverDefaultAsset);
    console.log('Amount:', AssetAmount);

    // Step 2: Check if swap is needed
    const needsSwap = AssetCode.toUpperCase() !== receiverDefaultAsset.toUpperCase();

    if (!needsSwap) {
      // No swap needed - direct payment
      console.log('No swap needed, sending directly');
      
      const senderAccount = await server.loadAccount(senderPublic);
      const assetIssuer = await findAssetIssuer(AssetCode);
      
      let stellarAsset;
      if (AssetCode === 'XLM' || AssetCode === 'native' || !assetIssuer) {
        stellarAsset = StellarSDK.Asset.native();
      } else {
        stellarAsset = new StellarSDK.Asset(AssetCode, assetIssuer);
      }

      const transaction = new StellarSDK.TransactionBuilder(senderAccount, {
        fee: StellarSDK.BASE_FEE,
        networkPassphrase: networkPassphrase,
      })
        .addOperation(
          StellarSDK.Operation.payment({
            destination: recieverWallet,
            asset: stellarAsset,
            amount: AssetAmount.toString(),
          })
        )
        .setTimeout(30)
        .build();

      transaction.sign(senderKeypair);
      const result = await server.submitTransaction(transaction);

      return res.json({
        success: true,
        message: 'Direct payment sent successfully (no swap needed)',
        swap_performed: false,
        transaction_hash: result.hash,
        from: senderPublic,
        to: recieverWallet,
        amount: AssetAmount,
        asset: AssetCode,
      });
    }

    // Step 3: Swap needed - perform auto-swap
    console.log('Swap needed! Performing auto-swap...');

    try {
      // Get issuers for both assets
      const sourceIssuer = await findAssetIssuer(AssetCode);
      const destIssuer = await findAssetIssuer(receiverDefaultAsset);

      const sourceAsset = {
        code: AssetCode,
        issuer: sourceIssuer
      };

      const destAsset = {
        code: receiverDefaultAsset,
        issuer: destIssuer
      };

      // Perform the swap and send
      const swapResult = await performSwap(
        senderKeypair,
        sourceAsset,
        AssetAmount,
        destAsset,
        recieverWallet
      );

      return res.json({
        success: true,
        message: 'Payment sent with auto-swap successfully',
        swap_performed: true,
        transaction_hash: swapResult.transaction_hash,
        from: senderPublic,
        to: recieverWallet,
        original_amount: AssetAmount,
        original_asset: AssetCode,
        final_amount: swapResult.destination_amount,
        final_asset: receiverDefaultAsset,
        receiver_default_asset: receiverDefaultAsset,
        note: `Automatically swapped ${AssetAmount} ${AssetCode} to ${swapResult.destination_amount} ${receiverDefaultAsset} based on receiver preference`
      });

    } catch (swapError) {
      console.error('Auto-swap failed:', swapError);
      
      return res.status(400).json({
        error: 'Auto-swap failed',
        details: swapError.message,
        suggestion: 'This might happen if there is no liquidity pool between the assets. Try creating a liquidity pool or sending in the same asset as the receiver prefers.',
        sender_asset: AssetCode,
        receiver_preferred_asset: receiverDefaultAsset
      });
    }

  } catch (error) {
    console.error('Direct pay error:', error);
    res.status(500).json({ 
      error: 'Payment failed', 
      details: error.message 
    });
  }
};

// Protected Pay - Initiate escrow with OTP (supports any asset)
exports.initiateProtectedPay = async (req, res) => {
  try {
    const { senderSecret, receiverWallet, AssetCode, AssetAmount, assetIssuer } = req.body;

    // Validation
    if (!senderSecret || !receiverWallet || !AssetCode || !AssetAmount) {
      return res.status(400).json({ 
        error: 'Missing required fields: senderSecret, receiverWallet, AssetCode, AssetAmount' 
      });
    }

    const senderKeypair = StellarSDK.Keypair.fromSecret(senderSecret);
    const senderPublic = senderKeypair.publicKey();

    const paymentId = generatePaymentId();
    const otp = generateOTP();
    const otpHash = hashOTP(otp);

    console.log('=== Protected Pay Details ===');
    console.log('Payment ID:', paymentId);
    console.log('OTP:', otp);
    console.log('OTP Hash:', otpHash);
    console.log('Asset:', AssetCode);
    console.log('Amount:', AssetAmount);

    // Determine asset issuer if not provided
    let finalAssetIssuer = assetIssuer;
    if (!finalAssetIssuer && AssetCode !== 'XLM' && AssetCode !== 'native') {
      try {
        finalAssetIssuer = await findAssetIssuer(AssetCode);
      } catch (error) {
        return res.status(400).json({
          error: 'Asset issuer required',
          details: `Please provide assetIssuer for ${AssetCode}, or it could not be found automatically`
        });
      }
    }

    const tokenAddress = getTokenContractAddress(AssetCode, finalAssetIssuer);
    console.log('Token Address:', tokenAddress);

    const senderAccount = await server.loadAccount(senderPublic);

    const contractId = validateContractId(process.env.CONTRACT_ID);
    console.log('Contract ID:', contractId);

    const contract = new Contract(contractId);
    const amountInStroops = Math.floor(parseFloat(AssetAmount) * 10000000);

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
          nativeToScVal(receiverWallet, { type: 'address' }),
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
      
      // Store escrow metadata in Appwrite for later swap
      try {
        await storeEscrowMetadata(paymentId, {
          payment_id: paymentId,
          sender: senderPublic,
          receiver: receiverWallet,
          asset_code: AssetCode,
          asset_issuer: finalAssetIssuer || null,
          amount: AssetAmount,
          token_contract: tokenAddress,
          transaction_hash: sendResponse.hash,
          created_at: new Date().toISOString(),
          status: 'pending'
        });
        console.log('Escrow metadata saved to Appwrite');
      } catch (metadataError) {
        console.error('Failed to save escrow metadata:', metadataError);
        // Continue anyway - the escrow is created on-chain
      }
      
      res.json({
        success: true,
        message: 'Protected payment initiated. Share OTP with receiver.',
        payment_id: paymentId,
        otp: otp,
        sender: senderPublic,
        receiver: receiverWallet,
        amount: AssetAmount,
        asset: AssetCode,
        asset_issuer: finalAssetIssuer || 'native',
        token_contract: tokenAddress,
        transaction_hash: sendResponse.hash,
        status: 'pending',
        note: `${AssetAmount} ${AssetCode} locked in escrow. Receiver can claim with OTP, funds will be auto-swapped to their preferred asset!`
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

// Verify OTP and release funds with auto-swap
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
    const receiverPublic = receiverKeypair.publicKey();

    console.log('=== Verifying and Releasing with Auto-Swap ===');
    console.log('Payment ID:', payment_id);
    console.log('Receiver:', receiverPublic);

    // Step 1: Get escrow metadata from Appwrite
    let escrowMetadata;
    try {
      escrowMetadata = await getEscrowMetadata(payment_id);
    } catch (error) {
      return res.status(404).json({
        error: 'Payment not found',
        details: 'No escrow metadata found for this payment ID',
        note: 'Payment may have already been released or does not exist'
      });
    }

    console.log('Escrow metadata:', escrowMetadata);

    const escrowAssetCode = escrowMetadata.asset_code;
    const escrowAssetIssuer = escrowMetadata.asset_issuer;
    const escrowAmount = escrowMetadata.amount;

    // Step 2: Get receiver's preferred asset
    let receiverDefaultAsset;
    try {
      receiverDefaultAsset = await getReceiverDefaultAsset(receiverPublic);
    } catch (error) {
      console.log('No receiver preference found, will release original asset');
      receiverDefaultAsset = null;
    }

    // If no preference, use escrow asset (no swap)
    if (!receiverDefaultAsset) {
      receiverDefaultAsset = escrowAssetCode;
    }

    console.log('Escrow Asset:', escrowAssetCode);
    console.log('Receiver Preferred Asset:', receiverDefaultAsset);

    // Step 3: Release funds from escrow
    const account = await server.loadAccount(receiverPublic);
    const contract = new Contract(contractId);

    const releaseTx = new StellarSDK.TransactionBuilder(account, {
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

    releaseTx.sign(receiverKeypair);

    const sorobanServer = new SorobanRpc.Server(process.env.SOROBAN_RPC_URL);
    const releaseSimResponse = await sorobanServer.simulateTransaction(releaseTx);
    
    if (SorobanRpc.Api.isSimulationError(releaseSimResponse)) {
      return res.status(400).json({ 
        error: 'OTP verification failed', 
        details: releaseSimResponse.error,
        note: 'Invalid OTP or payment already released'
      });
    }

    // Assemble the transaction
    let preparedTransaction = SorobanRpc.assembleTransaction(releaseTx, releaseSimResponse);

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
        error: 'Release transaction failed', 
        details: sendResponse 
      });
    }

    // Wait for release transaction to complete
    let getResponse = await sorobanServer.getTransaction(sendResponse.hash);
    let attempts = 0;
    
    while (getResponse.status === 'NOT_FOUND' && attempts < 10) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      getResponse = await sorobanServer.getTransaction(sendResponse.hash);
      attempts++;
    }

    if (getResponse.status !== 'SUCCESS') {
      return res.status(400).json({ 
        error: 'Verification failed', 
        status: getResponse.status,
        details: 'Invalid OTP or transaction error'
      });
    }

    console.log('✅ Funds released from escrow!');
    console.log('Release transaction:', sendResponse.hash);

    // Step 4: Check if swap is needed
    const needsSwap = escrowAssetCode.toUpperCase() !== receiverDefaultAsset.toUpperCase();

    if (!needsSwap) {
      // No swap needed - clean up and return
      await deleteEscrowMetadata(payment_id);
      
      return res.json({
        success: true,
        message: 'OTP verified! Funds released successfully (no swap needed).',
        swap_performed: false,
        payment_id: payment_id,
        receiver: receiverPublic,
        amount: escrowAmount,
        asset: escrowAssetCode,
        release_transaction_hash: sendResponse.hash,
        status: 'completed'
      });
    }

    // Step 5: Perform auto-swap
    console.log('🔄 Swap needed! Performing auto-swap...');

    try {
      // Wait a bit for release to propagate
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Get issuers for both assets
      const sourceIssuer = escrowAssetIssuer;
      const destIssuer = await findAssetIssuer(receiverDefaultAsset);

      const sourceAsset = {
        code: escrowAssetCode,
        issuer: sourceIssuer
      };

      const destAsset = {
        code: receiverDefaultAsset,
        issuer: destIssuer
      };

      // Perform the swap
      const swapResult = await performSwap(
        receiverKeypair,
        sourceAsset,
        escrowAmount,
        destAsset,
        receiverPublic // Swap to self
      );

      // Clean up metadata
      await deleteEscrowMetadata(payment_id);

      return res.json({
        success: true,
        message: 'OTP verified! Funds released and auto-swapped successfully.',
        swap_performed: true,
        payment_id: payment_id,
        receiver: receiverPublic,
        release_transaction_hash: sendResponse.hash,
        swap_transaction_hash: swapResult.transaction_hash,
        original_amount: escrowAmount,
        original_asset: escrowAssetCode,
        final_amount: swapResult.destination_amount,
        final_asset: receiverDefaultAsset,
        status: 'completed',
        note: `Released ${escrowAmount} ${escrowAssetCode} from escrow, then swapped to ${swapResult.destination_amount} ${receiverDefaultAsset} based on your preference!`
      });

    } catch (swapError) {
      console.error('Auto-swap failed after release:', swapError);
      
      // Funds are already released in original asset, so we still succeeded partially
      await deleteEscrowMetadata(payment_id);
      
      return res.json({
        success: true,
        message: 'OTP verified! Funds released but auto-swap failed.',
        swap_performed: false,
        swap_error: swapError.message,
        payment_id: payment_id,
        receiver: receiverPublic,
        amount: escrowAmount,
        asset: escrowAssetCode,
        release_transaction_hash: sendResponse.hash,
        status: 'completed',
        note: `Funds released successfully as ${escrowAssetCode}, but could not swap to ${receiverDefaultAsset}. You may need to swap manually.`,
        suggestion: 'Check if liquidity pool exists between the assets, or if you have the necessary trustlines.'
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
};

module.exports = exports;
