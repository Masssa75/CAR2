'use client';

import { useState, useCallback, useRef } from 'react';
import { X } from 'lucide-react';

interface SimpleAddTokenModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface TokenCandidate {
  source: 'coingecko' | 'dexscreener';
  id: string;
  symbol: string;
  name: string;
  isNative: boolean;
  contractAddress?: string;
  network?: string;
  website?: string;
  whitepaper?: string;
  marketCap?: number;
  confidence: number; // 0-100, how confident we are this is the right token
  image?: string; // Token icon/logo URL
}

export function SimpleAddTokenModal({ isOpen, onClose, onSuccess }: SimpleAddTokenModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [candidates, setCandidates] = useState<TokenCandidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<TokenCandidate | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Reset state when modal closes
  const handleClose = () => {
    setSearchQuery('');
    setIsSearching(false);
    setCandidates([]);
    setSelectedCandidate(null);
    setError(null);
    setSuccessMessage(null);
    onClose();
  };

  // Unified search that tries everything
  const handleSearch = useCallback(async (query: string) => {
    if (!query || query.trim().length < 2) {
      setCandidates([]);
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      // Search both CoinGecko and DexScreener in parallel
      const [coinGeckoResults, dexScreenerResults] = await Promise.allSettled([
        searchCoinGecko(query),
        searchDexScreener(query)
      ]);

      const allCandidates: TokenCandidate[] = [];

      // Process CoinGecko results
      if (coinGeckoResults.status === 'fulfilled' && coinGeckoResults.value) {
        allCandidates.push(...coinGeckoResults.value);
      }

      // Process DexScreener results
      if (dexScreenerResults.status === 'fulfilled' && dexScreenerResults.value) {
        allCandidates.push(...dexScreenerResults.value);
      }

      // Sort by confidence score (highest first)
      allCandidates.sort((a, b) => b.confidence - a.confidence);

      // Remove duplicates (keep highest confidence)
      const uniqueCandidates = allCandidates.reduce((acc, curr) => {
        const existing = acc.find(c =>
          c.symbol.toLowerCase() === curr.symbol.toLowerCase() &&
          c.name.toLowerCase() === curr.name.toLowerCase()
        );
        if (!existing || existing.confidence < curr.confidence) {
          return [...acc.filter(c => c !== existing), curr];
        }
        return acc;
      }, [] as TokenCandidate[]);

      setCandidates(uniqueCandidates.slice(0, 5)); // Show top 5

      // If only one high-confidence result, auto-select it
      if (uniqueCandidates.length === 1 && uniqueCandidates[0].confidence > 80) {
        setSelectedCandidate(uniqueCandidates[0]);
      }

    } catch (err) {
      console.error('Search error:', err);
      setError('Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounced search
  const handleSearchInput = useCallback((value: string) => {
    setSearchQuery(value);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      handleSearch(value);
    }, 300);
  }, [handleSearch]);

  // Submit selected token
  const handleSubmit = async () => {
    if (!selectedCandidate) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const payload: any = {
        contractAddress: selectedCandidate.isNative
          ? `native:${selectedCandidate.id}`
          : selectedCandidate.contractAddress,
        network: selectedCandidate.network || 'ethereum'
      };

      // Include symbol and name if available (from CoinGecko)
      if (selectedCandidate.symbol) {
        payload.symbol = selectedCandidate.symbol;
      }

      if (selectedCandidate.name) {
        payload.name = selectedCandidate.name;
      }

      if (selectedCandidate.website) {
        payload.websiteUrl = selectedCandidate.website;
      }

      if (selectedCandidate.whitepaper) {
        payload.whitepaperUrl = selectedCandidate.whitepaper;
      }

      const response = await fetch('/api/add-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to add token');
        setIsSubmitting(false);
        return;
      }

      setSuccessMessage(`${data.symbol} added successfully! Analysis in progress...`);

      setTimeout(() => {
        handleClose();
        if (onSuccess) onSuccess();
      }, 1500);

    } catch (err) {
      console.error('Submit error:', err);
      setError('Network error. Please try again.');
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold">Add Token</h2>
          <button
            onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Search Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search for token
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchInput(e.target.value)}
              placeholder="Enter token name, symbol, or contract address..."
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
              disabled={isSubmitting}
              autoFocus
            />
            <p className="mt-2 text-xs text-gray-500">
              Search by name (e.g., "Bittensor"), symbol (e.g., "TAO"), or contract address
            </p>
          </div>

          {/* Loading */}
          {isSearching && (
            <div className="text-center py-8 text-gray-500">
              Searching...
            </div>
          )}

          {/* Results */}
          {!isSearching && candidates.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-700">Select a token:</p>
              {candidates.map((candidate, idx) => (
                <button
                  key={`${candidate.source}-${candidate.id}-${idx}`}
                  onClick={() => setSelectedCandidate(candidate)}
                  className={`w-full p-5 rounded-xl border-2 transition-all text-left hover:shadow-md ${
                    selectedCandidate?.id === candidate.id && selectedCandidate?.source === candidate.source
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {/* Token Icon */}
                    <div className="flex-shrink-0">
                      {candidate.image ? (
                        <img
                          src={candidate.image}
                          alt={candidate.symbol}
                          className="w-12 h-12 rounded-full"
                          onError={(e) => {
                            // Fallback to initials if image fails to load
                            e.currentTarget.style.display = 'none';
                            if (e.currentTarget.nextElementSibling) {
                              (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex';
                            }
                          }}
                        />
                      ) : null}
                      <div
                        className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-bold text-lg"
                        style={{ display: candidate.image ? 'none' : 'flex' }}
                      >
                        {candidate.symbol.substring(0, 2).toUpperCase()}
                      </div>
                    </div>

                    {/* Token Info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-xl text-gray-900">{candidate.symbol}</div>
                      <div className="text-sm text-gray-500 truncate">{candidate.name}</div>
                    </div>

                    {/* Source Badge */}
                    <div className="flex-shrink-0">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-600">
                        {candidate.source === 'coingecko' ? 'CoinGecko' : 'DexScreener'}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* No results */}
          {!isSearching && searchQuery.length >= 2 && candidates.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No tokens found. Try a different search term.
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
              {successMessage}
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={!selectedCandidate || isSubmitting}
            className={`w-full py-3.5 rounded-lg font-bold text-base transition-all ${
              !selectedCandidate || isSubmitting
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-br from-emerald-400 to-emerald-600 text-white hover:from-emerald-500 hover:to-emerald-700 shadow-md hover:shadow-lg'
            }`}
          >
            {isSubmitting ? 'Adding Token...' : 'Add Token'}
          </button>

          <p className="text-xs text-center text-gray-500">
            Token must be listed on a DEX with at least $100 liquidity
          </p>
        </div>
      </div>
    </div>
  );
}

// Helper functions
async function searchCoinGecko(query: string): Promise<TokenCandidate[]> {
  // Check if it's a contract address (0x...)
  const isContractAddress = /^0x[a-fA-F0-9]{40}$/.test(query);

  if (isContractAddress) {
    // For contract addresses, we can't search CoinGecko directly
    // We'd need to resolve it via DexScreener first
    return [];
  }

  // Search by name/symbol
  const response = await fetch(`/api/search-tokens?q=${encodeURIComponent(query)}`);
  if (!response.ok) return [];

  const data = await response.json();
  const coins = data.coins || [];

  // Fetch details for top 3 results
  const detailedResults = await Promise.allSettled(
    coins.slice(0, 3).map(async (coin: any) => {
      const detailsResponse = await fetch('/api/search-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coinId: coin.id })
      });

      if (!detailsResponse.ok) return null;

      const details = await detailsResponse.json();

      // Calculate confidence score
      let confidence = 50; // Base score
      if (coin.symbol.toLowerCase() === query.toLowerCase()) confidence += 30;
      if (coin.name.toLowerCase().includes(query.toLowerCase())) confidence += 20;
      if (coin.market_cap_rank && coin.market_cap_rank <= 100) confidence += 10;

      return {
        source: 'coingecko' as const,
        id: details.id,
        symbol: details.symbol.toUpperCase(),
        name: details.name,
        isNative: details.isNativeToken,
        contractAddress: details.isNativeToken ? undefined : Object.values(details.platforms || {})[0] as string,
        network: details.isNativeToken ? undefined : Object.keys(details.platforms || {})[0],
        website: details.links?.website,
        whitepaper: details.links?.whitepaper,
        image: details.image,
        confidence
      };
    })
  );

  return detailedResults
    .filter((r): r is PromiseFulfilledResult<TokenCandidate> => r.status === 'fulfilled' && r.value !== null)
    .map(r => r.value);
}

async function searchDexScreener(query: string): Promise<TokenCandidate[]> {
  // Check if it's a contract address
  const isContractAddress = /^0x[a-fA-F0-9]{40}$/.test(query);

  if (!isContractAddress) {
    // DexScreener doesn't have good name/symbol search
    return [];
  }

  try {
    const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${query}`);
    if (!response.ok) return [];

    const data = await response.json();
    const pairs = data.pairs || [];

    if (pairs.length === 0) return [];

    // Get the most liquid pair
    const bestPair = pairs.reduce((best: any, current: any) => {
      return (current.liquidity?.usd || 0) > (best.liquidity?.usd || 0) ? current : best;
    }, pairs[0]);

    const networkMap: Record<string, string> = {
      'ethereum': 'ethereum',
      'arbitrum': 'arbitrum',
      'optimism': 'optimism',
      'base': 'base',
      'polygon': 'polygon',
      'avalanche': 'avalanche',
      'bsc': 'bsc',
      'fantom': 'fantom',
      'solana': 'solana',
      'sui': 'sui',
      'pulse': 'pulsechain',
      'pulsechain': 'pulsechain',
      'zksync': 'zksync',
      'linea': 'linea',
      'scroll': 'scroll'
    };

    const candidate: TokenCandidate = {
      source: 'dexscreener',
      id: bestPair.baseToken.address,
      symbol: bestPair.baseToken.symbol,
      name: bestPair.baseToken.name,
      isNative: false,
      contractAddress: bestPair.baseToken.address,
      network: networkMap[bestPair.chainId] || bestPair.chainId,
      website: bestPair.info?.websites?.[0],
      confidence: bestPair.liquidity?.usd > 100000 ? 70 : 50
    };

    // If DexScreener doesn't have a website, try CoinGecko as fallback
    if (!candidate.website && bestPair.baseToken.symbol) {
      try {
        const response = await fetch(`/api/search-tokens?q=${encodeURIComponent(bestPair.baseToken.symbol)}`);
        if (response.ok) {
          const data = await response.json();
          const coins = data.coins || [];
          // Find exact symbol match
          const coin = coins.find((c: any) => c.symbol?.toUpperCase() === bestPair.baseToken.symbol.toUpperCase());

          if (coin?.id) {
            // Fetch coin details
            const detailsResponse = await fetch('/api/search-tokens', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ coinId: coin.id })
            });

            if (detailsResponse.ok) {
              const details = await detailsResponse.json();
              if (details.links?.website) {
                candidate.website = details.links.website;
                console.log(`✅ Found website from CoinGecko for ${bestPair.baseToken.symbol}: ${details.links.website}`);
              }
              if (details.links?.whitepaper) {
                candidate.whitepaper = details.links.whitepaper;
              }
            }
          }
        }
      } catch (err) {
        console.log('Failed to fetch CoinGecko fallback data:', err);
      }
    }

    return [candidate];
  } catch (err) {
    console.error('DexScreener search error:', err);
    return [];
  }
}
