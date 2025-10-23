'use client';

import { ExternalLink } from 'lucide-react';

interface PlatformLinksProps {
  coinGeckoId?: string | null;
  contractAddress?: string | null;
  network?: string | null;
  symbol: string;
}

// Map CAR2 network names to GeckoTerminal network slugs
const NETWORK_MAP: Record<string, string> = {
  'ethereum': 'eth',
  'arbitrum': 'arbitrum',
  'base': 'base',
  'polygon': 'polygon_pos',
  'avalanche': 'avax',
  'bnb': 'bsc',
  'fantom': 'ftm',
  'solana': 'solana',
  'sui': 'sui',
  'optimism': 'optimism',
  'zksync': 'zksync',
  'linea': 'linea',
  'scroll': 'scroll',
};

export function PlatformLinks({
  coinGeckoId,
  contractAddress,
  network,
  symbol
}: PlatformLinksProps) {
  const links: { name: string; url: string; icon: string; available: boolean }[] = [];

  // Priority 1: CoinGecko (if we have ID)
  if (coinGeckoId) {
    links.push({
      name: 'CoinGecko',
      url: `https://www.coingecko.com/en/coins/${coinGeckoId}`,
      icon: '🦎',
      available: true
    });
  }

  // Priority 2: GeckoTerminal (if we have contract + network)
  if (contractAddress && network) {
    const geckoNetwork = NETWORK_MAP[network.toLowerCase()];
    if (geckoNetwork) {
      links.push({
        name: 'GeckoTerminal',
        url: `https://www.geckoterminal.com/${geckoNetwork}/pools/${contractAddress}`,
        icon: '📊',
        available: true
      });
    }
  }

  // Priority 3: CoinMarketCap (fallback - symbol-based, less reliable)
  const cmcSlug = symbol.toLowerCase().replace(/\s+/g, '-');
  links.push({
    name: 'CMC',
    url: `https://coinmarketcap.com/currencies/${cmcSlug}`,
    icon: '💎',
    available: true
  });

  return (
    <div className="flex items-center gap-2 mt-1">
      {links.map((link, index) => (
        <a
          key={link.name}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-[#ff6600] transition-colors"
          title={`View on ${link.name}`}
        >
          <span className="text-sm">{link.icon}</span>
          <span className="font-medium">{link.name}</span>
          <ExternalLink size={10} className="opacity-70" />
        </a>
      ))}
    </div>
  );
}
