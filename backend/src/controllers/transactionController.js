const {
  getGlobalTransactionHistory,
  getP2PTransactionHistory,
  getTransactionStats,
  getTransactionDetails
} = require('../utils/transactionHelper');

// Get global transaction history
exports.getGlobalHistory = async (req, res) => {
  try {
    const { publicKey } = req.params;
    const { limit, cursor } = req.query;
    
    if (!publicKey) {
      return res.status(400).json({
        success: false,
        error: 'Public key is required'
      });
    }
    
    const result = await getGlobalTransactionHistory(
      publicKey,
      parseInt(limit) || 50,
      cursor || null
    );
    
    res.json({
      success: true,
      publicKey: publicKey,
      count: result.transactions.length,
      nextCursor: result.nextCursor,
      data: result.transactions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch global transaction history',
      details: error.message
    });
  }
};

// Get P2P transaction history between two wallets
exports.getP2PHistory = async (req, res) => {
  try {
    const { wallet1, wallet2 } = req.params;
    const { limit, cursor } = req.query;
    
    if (!wallet1 || !wallet2) {
      return res.status(400).json({
        success: false,
        error: 'Both wallet1 and wallet2 public keys are required'
      });
    }
    
    if (wallet1 === wallet2) {
      return res.status(400).json({
        success: false,
        error: 'Wallet1 and wallet2 cannot be the same'
      });
    }
    
    const result = await getP2PTransactionHistory(
      wallet1,
      wallet2,
      parseInt(limit) || 50,
      cursor || null
    );
    
    res.json({
      success: true,
      wallet1: result.wallet1,
      wallet2: result.wallet2,
      count: result.transactions.length,
      nextCursor: result.nextCursor,
      data: result.transactions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch P2P transaction history',
      details: error.message
    });
  }
};

// Get transaction statistics
exports.getStats = async (req, res) => {
  try {
    const { publicKey } = req.params;
    const { days } = req.query;
    
    if (!publicKey) {
      return res.status(400).json({
        success: false,
        error: 'Public key is required'
      });
    }
    
    const stats = await getTransactionStats(
      publicKey,
      parseInt(days) || 30
    );
    
    res.json({
      success: true,
      publicKey: publicKey,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transaction statistics',
      details: error.message
    });
  }
};

// Get single transaction details
exports.getTransactionDetail = async (req, res) => {
  try {
    const { hash } = req.params;
    
    if (!hash) {
      return res.status(400).json({
        success: false,
        error: 'Transaction hash is required'
      });
    }
    
    const transaction = await getTransactionDetails(hash);
    
    res.json({
      success: true,
      data: transaction
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transaction details',
      details: error.message
    });
  }
};

module.exports = exports;
