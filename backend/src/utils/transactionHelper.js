const StellarSdk = require('@stellar/stellar-sdk');
require('dotenv').config();

// Initialize Stellar Server
const getServer = () => {
  const horizonUrl = process.env.HORIZON_URL || 'https://horizon-testnet.stellar.org';
  return new StellarSdk.Horizon.Server(horizonUrl);
};

// Get global transaction history for an account
const getGlobalTransactionHistory = async (publicKey, limit = 50, cursor = null) => {
  try {
    const server = getServer();
    
    // Get payments (includes sends and receives)
    let paymentsCall = server
      .payments()
      .forAccount(publicKey)
      .limit(limit)
      .order('desc');
    
    if (cursor) {
      paymentsCall = paymentsCall.cursor(cursor);
    }
    
    const payments = await paymentsCall.call();
    
    // Process each payment to get detailed info
    const transactions = [];
    
    for (const payment of payments.records) {
      try {
        // Get the transaction details
        const transaction = await payment.transaction();
        
        // Determine if this is a send or receive
        const isSent = payment.from === publicKey;
        const isReceived = payment.to === publicKey;
        
        // Get asset info
        let assetCode = 'XLM';
        let assetIssuer = null;
        
        if (payment.asset_type !== 'native') {
          assetCode = payment.asset_code;
          assetIssuer = payment.asset_issuer;
        }
        
        transactions.push({
          id: payment.id,
          transactionHash: payment.transaction_hash,
          type: payment.type,
          direction: isSent ? 'sent' : 'received',
          from: payment.from,
          to: payment.to,
          amount: payment.amount,
          assetCode: assetCode,
          assetIssuer: assetIssuer,
          createdAt: payment.created_at,
          memo: transaction.memo || null,
          memoType: transaction.memo_type || null,
          pagingToken: payment.paging_token
        });
      } catch (err) {
        console.error('Error processing payment:', err);
      }
    }
    
    return {
      transactions: transactions,
      nextCursor: payments.records.length > 0 
        ? payments.records[payments.records.length - 1].paging_token 
        : null
    };
  } catch (error) {
    throw new Error(`Failed to fetch transaction history: ${error.message}`);
  }
};

// Get P2P transaction history between two accounts
const getP2PTransactionHistory = async (wallet1, wallet2, limit = 50, cursor = null) => {
  try {
    const server = getServer();
    
    // Get all payments for wallet1
    let paymentsCall = server
      .payments()
      .forAccount(wallet1)
      .limit(200) // Get more to filter
      .order('desc');
    
    if (cursor) {
      paymentsCall = paymentsCall.cursor(cursor);
    }
    
    const payments = await paymentsCall.call();
    
    // Filter transactions between wallet1 and wallet2
    const p2pTransactions = [];
    
    for (const payment of payments.records) {
      try {
        // Check if this payment involves both wallets
        const involvesWallet2 = 
          (payment.from === wallet1 && payment.to === wallet2) ||
          (payment.from === wallet2 && payment.to === wallet1);
        
        if (!involvesWallet2) {
          continue;
        }
        
        // Get the transaction details
        const transaction = await payment.transaction();
        
        // Determine direction from wallet1's perspective
        const isSent = payment.from === wallet1;
        
        // Get asset info
        let assetCode = 'XLM';
        let assetIssuer = null;
        
        if (payment.asset_type !== 'native') {
          assetCode = payment.asset_code;
          assetIssuer = payment.asset_issuer;
        }
        
        p2pTransactions.push({
          id: payment.id,
          transactionHash: payment.transaction_hash,
          type: payment.type,
          direction: isSent ? 'sent' : 'received',
          from: payment.from,
          to: payment.to,
          amount: payment.amount,
          assetCode: assetCode,
          assetIssuer: assetIssuer,
          createdAt: payment.created_at,
          memo: transaction.memo || null,
          memoType: transaction.memo_type || null,
          pagingToken: payment.paging_token
        });
        
        // Stop if we have enough transactions
        if (p2pTransactions.length >= limit) {
          break;
        }
      } catch (err) {
        console.error('Error processing payment:', err);
      }
    }
    
    return {
      transactions: p2pTransactions,
      wallet1: wallet1,
      wallet2: wallet2,
      nextCursor: p2pTransactions.length > 0 
        ? p2pTransactions[p2pTransactions.length - 1].pagingToken 
        : null
    };
  } catch (error) {
    throw new Error(`Failed to fetch P2P transaction history: ${error.message}`);
  }
};

// Get transaction statistics
const getTransactionStats = async (publicKey, days = 30) => {
  try {
    const server = getServer();
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Get payments
    const payments = await server
      .payments()
      .forAccount(publicKey)
      .limit(200)
      .order('desc')
      .call();
    
    let totalSent = 0;
    let totalReceived = 0;
    let sentCount = 0;
    let receivedCount = 0;
    const assetBreakdown = {};
    
    for (const payment of payments.records) {
      const paymentDate = new Date(payment.created_at);
      
      // Only include payments within date range
      if (paymentDate < startDate) {
        continue;
      }
      
      const amount = parseFloat(payment.amount);
      const isSent = payment.from === publicKey;
      
      // Get asset code
      let assetCode = 'XLM';
      if (payment.asset_type !== 'native') {
        assetCode = payment.asset_code;
      }
      
      // Update totals
      if (isSent) {
        totalSent += amount;
        sentCount++;
      } else {
        totalReceived += amount;
        receivedCount++;
      }
      
      // Update asset breakdown
      if (!assetBreakdown[assetCode]) {
        assetBreakdown[assetCode] = {
          sent: 0,
          received: 0,
          sentCount: 0,
          receivedCount: 0
        };
      }
      
      if (isSent) {
        assetBreakdown[assetCode].sent += amount;
        assetBreakdown[assetCode].sentCount++;
      } else {
        assetBreakdown[assetCode].received += amount;
        assetBreakdown[assetCode].receivedCount++;
      }
    }
    
    return {
      period: `${days} days`,
      totalTransactions: sentCount + receivedCount,
      sent: {
        count: sentCount,
        total: totalSent.toFixed(7)
      },
      received: {
        count: receivedCount,
        total: totalReceived.toFixed(7)
      },
      assetBreakdown: assetBreakdown
    };
  } catch (error) {
    throw new Error(`Failed to fetch transaction stats: ${error.message}`);
  }
};

// Get single transaction details
const getTransactionDetails = async (transactionHash) => {
  try {
    const server = getServer();
    
    const transaction = await server.transactions().transaction(transactionHash).call();
    
    // Get operations for this transaction
    const operations = await server
      .operations()
      .forTransaction(transactionHash)
      .call();
    
    return {
      hash: transaction.hash,
      ledger: transaction.ledger,
      createdAt: transaction.created_at,
      sourceAccount: transaction.source_account,
      fee: transaction.fee_charged,
      operationCount: transaction.operation_count,
      memo: transaction.memo || null,
      memoType: transaction.memo_type || null,
      successful: transaction.successful,
      operations: operations.records.map(op => ({
        id: op.id,
        type: op.type,
        from: op.from || op.source_account,
        to: op.to || op.destination,
        amount: op.amount || null,
        assetCode: op.asset_code || 'XLM',
        assetIssuer: op.asset_issuer || null
      }))
    };
  } catch (error) {
    throw new Error(`Failed to fetch transaction details: ${error.message}`);
  }
};

module.exports = {
  getGlobalTransactionHistory,
  getP2PTransactionHistory,
  getTransactionStats,
  getTransactionDetails
};
