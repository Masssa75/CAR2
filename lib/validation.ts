// Contract address validation utilities

/**
 * Validates an Ethereum/EVM contract address (0x...)
 */
export function isValidEVMAddress(address: string): boolean {
  // EVM addresses are 42 characters: 0x + 40 hex chars
  const evmRegex = /^0x[a-fA-F0-9]{40}$/;
  return evmRegex.test(address);
}

/**
 * Validates a Solana contract address (base58)
 */
export function isValidSolanaAddress(address: string): boolean {
  // Solana addresses are base58 encoded, typically 32-44 characters
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  return base58Regex.test(address);
}

/**
 * Validates a Bittensor subnet ID (numeric)
 */
export function isValidBittensorSubnetId(address: string): boolean {
  // Bittensor uses numeric subnet IDs (0-999+)
  const numericRegex = /^\d+$/;
  return numericRegex.test(address);
}

/**
 * Validates a contract address based on the network
 */
export function isValidContractAddress(address: string, network: string): boolean {
  if (!address || !network) return false;

  const normalizedNetwork = network.toLowerCase();

  // Bittensor uses numeric subnet IDs
  if (normalizedNetwork === 'bittensor') {
    return isValidBittensorSubnetId(address);
  }

  // Solana and Sui use base58 addresses
  if (normalizedNetwork === 'solana' || normalizedNetwork === 'sui') {
    return isValidSolanaAddress(address);
  }

  // All EVM chains use 0x addresses
  const evmNetworks = [
    'ethereum', 'eth',
    'bsc', 'binance', 'bnb',
    'base',
    'pulsechain', 'pulse',
    'arbitrum',
    'avalanche', 'avax',
    'polygon', 'matic',
    'optimism',
    'fantom', 'ftm',
    'zksync',
    'linea',
    'scroll'
  ];
  if (evmNetworks.includes(normalizedNetwork)) {
    return isValidEVMAddress(address);
  }

  // Unknown network - be permissive but log warning
  console.warn(`Unknown network for validation: ${network}`);
  return isValidEVMAddress(address) || isValidSolanaAddress(address) || isValidBittensorSubnetId(address);
}

/**
 * Normalizes a contract address (lowercase for EVM)
 */
export function normalizeContractAddress(address: string, network: string): string {
  const normalizedNetwork = network.toLowerCase();

  // Bittensor subnet IDs are numeric - keep as-is
  if (normalizedNetwork === 'bittensor') {
    return address;
  }

  // Solana and Sui addresses are case-sensitive
  if (normalizedNetwork === 'solana' || normalizedNetwork === 'sui') {
    return address;
  }

  // EVM addresses should be lowercase for consistency
  return address.toLowerCase();
}

/**
 * Network display names and normalization
 */
export const NETWORKS = {
  ethereum: { display: 'Ethereum', value: 'ethereum', dexscreener: 'ethereum' },
  arbitrum: { display: 'Arbitrum', value: 'arbitrum', dexscreener: 'arbitrum' },
  optimism: { display: 'Optimism', value: 'optimism', dexscreener: 'optimism' },
  base: { display: 'Base', value: 'base', dexscreener: 'base' },
  polygon: { display: 'Polygon', value: 'polygon', dexscreener: 'polygon' },
  avalanche: { display: 'Avalanche', value: 'avalanche', dexscreener: 'avalanche' },
  bsc: { display: 'BNB Chain', value: 'bsc', dexscreener: 'bsc' },
  fantom: { display: 'Fantom', value: 'fantom', dexscreener: 'fantom' },
  solana: { display: 'Solana', value: 'solana', dexscreener: 'solana' },
  sui: { display: 'Sui', value: 'sui', dexscreener: 'sui' },
  bittensor: { display: 'Bittensor', value: 'bittensor', dexscreener: null },
  pulsechain: { display: 'PulseChain', value: 'pulsechain', dexscreener: 'pulsechain' },
  zksync: { display: 'zkSync', value: 'zksync', dexscreener: 'zksync' },
  linea: { display: 'Linea', value: 'linea', dexscreener: 'linea' },
  scroll: { display: 'Scroll', value: 'scroll', dexscreener: 'scroll' }
} as const;

export type NetworkKey = keyof typeof NETWORKS;

/**
 * Get normalized network name for API calls
 */
export function normalizeNetwork(network: string): string {
  const mapping: Record<string, string> = {
    'ethereum': 'ethereum',
    'eth': 'ethereum',
    'arbitrum': 'arbitrum',
    'arb': 'arbitrum',
    'optimism': 'optimism',
    'op': 'optimism',
    'base': 'base',
    'polygon': 'polygon',
    'matic': 'polygon',
    'avalanche': 'avalanche',
    'avax': 'avalanche',
    'bsc': 'bsc',
    'binance': 'bsc',
    'bnb': 'bsc',
    'fantom': 'fantom',
    'ftm': 'fantom',
    'solana': 'solana',
    'sol': 'solana',
    'sui': 'sui',
    'bittensor': 'bittensor',
    'pulsechain': 'pulsechain',
    'pulse': 'pulsechain',
    'zksync': 'zksync',
    'linea': 'linea',
    'scroll': 'scroll'
  };

  return mapping[network.toLowerCase()] || network.toLowerCase();
}