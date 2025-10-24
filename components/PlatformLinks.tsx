'use client';

interface PlatformLinksProps {
  coinGeckoId?: string | null;
  contractAddress?: string | null;
  network?: string | null;
}

// Map CAR2 network names to GeckoTerminal network slugs
const NETWORK_MAP: Record<string, string> = {
  'ethereum': 'eth',
  'arbitrum': 'arbitrum',
  'base': 'base',
  'polygon': 'polygon_pos',
  'avalanche': 'avax',
  'bnb': 'bsc',
  'bsc': 'bsc',
  'fantom': 'ftm',
  'solana': 'solana',
  'sui': 'sui',
  'optimism': 'optimism',
  'zksync': 'zksync',
  'linea': 'linea',
  'scroll': 'scroll',
};

/**
 * Platform links - icon-only design for cleaner UI
 * Priority: CoinGecko (primary) → GeckoTerminal (fallback)
 * Only shows fallback links when CoinGecko is NOT available
 */
export function PlatformLinks({
  coinGeckoId,
  contractAddress,
  network
}: PlatformLinksProps) {
  const links: { name: string; url: string; logo: string }[] = [];

  // CoinGecko (PRIMARY - most reliable, 75% coverage)
  // If we have CoinGecko ID, ONLY show CoinGecko (skip fallbacks)
  if (coinGeckoId) {
    links.push({
      name: 'CoinGecko',
      url: `https://www.coingecko.com/en/coins/${coinGeckoId}`,
      logo: 'https://static.coingecko.com/s/thumbnail-007177f3eca19695592f0b8b0eabbdae282b54154e1be912285c9034ea6cbaf2.png' // CoinGecko logo
    });
  } else if (contractAddress && network) {
    // GeckoTerminal (FALLBACK - only if NO CoinGecko ID)
    // Skip if contract has prefixes like "native:", "cg_", or network is "multi"/"native"/"other"
    const cleanContract = contractAddress.toLowerCase();
    const isValidContract = !cleanContract.startsWith('native:') &&
                           !cleanContract.startsWith('cg_') &&
                           cleanContract.length > 20; // Reasonable contract address length

    const geckoNetwork = NETWORK_MAP[network.toLowerCase()];

    if (isValidContract && geckoNetwork) {
      // Use token URL instead of pool URL for better reliability
      links.push({
        name: 'GeckoTerminal',
        url: `https://www.geckoterminal.com/${geckoNetwork}/tokens/${contractAddress}`,
        logo: 'https://assets.coingecko.com/markets/images/1029/small/geckoterminal.png' // GeckoTerminal logo
      });
    }
  }

  if (links.length === 0) return null;

  return (
    <>
      {links.map((link) => (
        <a
          key={link.name}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-gray-300 hover:text-emerald-600 transition-colors"
          title={`View on ${link.name}`}
        >
          <img
            src={link.logo}
            alt={link.name}
            className="w-3.5 h-3.5 opacity-70 hover:opacity-100"
          />
        </a>
      ))}
    </>
  );
}
