'use client';

import { useState } from 'react';
import { IoClose, IoSearchOutline, IoAddCircleOutline } from 'react-icons/io5';
import { useAuth } from '@/contexts/AuthContext';
import PinVerificationModal from './PinVerificationModal';

interface AssetSearchResult {
  assetType: string;
  assetCode: string;
  assetIssuer: string;
  flags: {
    auth_required: boolean;
    auth_revocable: boolean;
    auth_immutable: boolean;
    auth_clawback_enabled: boolean;
  };
}

interface AddAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  secretKey: string;
  onAddSuccess: () => void;
}

export default function AddAssetModal({ isOpen, onClose, secretKey, onAddSuccess }: AddAssetModalProps) {
  const { verifyPin } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<AssetSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<AssetSearchResult | null>(null);

  if (!isOpen) return null;

  const handleSearch = async () => {
    const query = searchQuery.trim().toUpperCase();
    if (!query) {
      setError('Enter an asset code to search');
      return;
    }

    setSearching(true);
    setError('');
    setSearchResults([]);

    try {
      const response = await fetch(`https://supi-two.vercel.app/api/wallet/assets/search?assetCode=${encodeURIComponent(query)}&limit=200`);
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to search assets');
      }

      if (result.count === 0) {
        setError('No assets found with this code');
      } else {
        setSearchResults(result.data || []);
      }
    } catch (err: any) {
      console.error('Error searching assets:', err);
      setError(err.message || 'Failed to search assets');
    } finally {
      setSearching(false);
    }
  };

  const handleAddAssetClick = (asset: AssetSearchResult) => {
    setSelectedAsset(asset);
    setError('');
    setShowPinModal(true);
  };

  const handlePinSuccess = async (pin: string) => {
    if (!verifyPin(pin)) {
      setError('Invalid PIN');
      setShowPinModal(false);
      return;
    }

    setShowPinModal(false);
    if (selectedAsset) {
      await processAddAsset(selectedAsset);
    }
  };

  const processAddAsset = async (asset: AssetSearchResult) => {
    setAdding(true);
    setError('');

    try {
      const response = await fetch('https://supi-two.vercel.app/api/wallet/assets/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          secretKey,
          assetCode: asset.assetCode,
          assetIssuer: asset.assetIssuer,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to add asset');
      }

      setSuccess(true);

      setTimeout(() => {
        onAddSuccess();
        resetAndClose();
      }, 1500);
    } catch (err: any) {
      console.error('Error adding asset:', err);
      setError(err.message || 'Failed to add asset');
    } finally {
      setAdding(false);
    }
  };

  const resetAndClose = () => {
    setSearchQuery('');
    setSearchResults([]);
    setError('');
    setSuccess(false);
    setSearching(false);
    setAdding(false);
    setSelectedAsset(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50" onClick={resetAndClose}>
      <div className="w-full max-w-md">
        <div
          className="bg-white rounded-t-2xl w-full p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold">Add Asset</h3>
            <button onClick={resetAndClose}>
              <IoClose size={24} />
            </button>
          </div>

          {success ? (
            <div className="py-8 text-center">
              <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <IoAddCircleOutline className="text-3xl text-white" />
              </div>
              <p className="text-xl font-bold text-green-600">Asset Added!</p>
              <p className="text-sm text-gray-600 mt-2">Refreshing balances...</p>
            </div>
          ) : (
            <>
              {/* Search Section */}
              <div className="space-y-3 mb-4">
                <label className="block text-sm font-medium text-gray-700">
                  Search Asset Code
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <IoSearchOutline className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xl" />
                    <input
                      type="text"
                      placeholder="e.g., USDC, INRC"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      className="w-full pl-10 pr-4 py-3 border rounded-lg text-gray-900"
                    />
                  </div>
                  <button
                    onClick={handleSearch}
                    disabled={searching}
                    className="px-6 py-3 bg-black text-[#FFC940] rounded-lg font-semibold disabled:opacity-50"
                  >
                    {searching ? 'Searching...' : 'Search'}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
                  {error}
                </div>
              )}

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  <p className="text-sm font-medium text-gray-700">
                    Found {searchResults.length} asset{searchResults.length !== 1 ? 's' : ''}
                  </p>
                  {searchResults.map((asset, index) => (
                    <div
                      key={`${asset.assetCode}-${asset.assetIssuer}-${index}`}
                      className="border border-gray-200 rounded-lg p-4 space-y-3"
                    >
                      <div className="flex justify-between items-start">
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-gray-900 text-lg">{asset.assetCode}</p>
                          <p className="text-xs text-gray-500 mt-1 font-mono break-all">
                            Issuer: {asset.assetIssuer}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleAddAssetClick(asset)}
                        disabled={adding}
                        className="w-full bg-[#FFC940] text-black py-3 rounded-lg font-semibold hover:bg-[#FFD966] disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {adding ? (
                          <>
                            <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                            Adding...
                          </>
                        ) : (
                          <>
                            <IoAddCircleOutline className="text-xl" />
                            Add to Wallet
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {!searchResults.length && !error && !searching && (
                <div className="py-8 text-center text-gray-500">
                  <IoSearchOutline className="text-4xl mx-auto mb-2 text-gray-400" />
                  <p className="text-sm">Search for an asset to add to your wallet</p>
                </div>
              )}
            </>
          )}
        </div>
        <div className="h-[100px] bg-white w-full max-w-md"></div>
      </div>

      {/* PIN Verification Modal */}
      <PinVerificationModal
        isOpen={showPinModal}
        onClose={() => setShowPinModal(false)}
        onSuccess={handlePinSuccess}
        title="Authorize Add Asset"
        description={selectedAsset ? `Enter your PIN to add ${selectedAsset.assetCode} to your wallet` : ''}
      />
    </div>
  );
}