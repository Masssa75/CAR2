import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isValidContractAddress, normalizeContractAddress, normalizeNetwork } from '@/lib/validation';

// Simple in-memory rate limiting (resets on server restart)
// In production, you'd want Redis or a database solution
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

const RATE_LIMIT = 50; // 50 requests per hour
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds

function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const userLimit = rateLimitMap.get(identifier);

  if (!userLimit || now > userLimit.resetTime) {
    // First request or window expired
    rateLimitMap.set(identifier, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW
    });
    return true;
  }

  if (userLimit.count >= RATE_LIMIT) {
    return false; // Rate limit exceeded
  }

  // Increment count
  userLimit.count++;
  return true;
}

// Fetch native token data from CoinGecko
async function fetchNativeTokenFromCoinGecko(coinGeckoId: string) {
  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/${coinGeckoId}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false`,
      {
        headers: {
          'Accept': 'application/json',
          ...(process.env.COINGECKO_API_KEY && {
            'x-cg-demo-api-key': process.env.COINGECKO_API_KEY
          })
        }
      }
    );

    if (!response.ok) {
      console.error(`CoinGecko API error: ${response.status}`);
      return null;
    }

    const data = await response.json();

    return {
      symbol: data.symbol?.toUpperCase() || coinGeckoId.toUpperCase(),
      name: data.name || coinGeckoId,
      website: data.links?.homepage?.[0] || null,
      whitepaper: data.links?.whitepaper || null,
      market_cap: data.market_data?.market_cap?.usd || null
    };
  } catch (error) {
    console.error('Error fetching from CoinGecko:', error);
    return null;
  }
}

// Fetch token data from DexScreener
async function fetchTokenDataFromDexScreener(contractAddress: string, network: string) {
  try {
    // Try to get token data from DexScreener
    const response = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${contractAddress}`,
      {
        headers: {
          'Accept': 'application/json',
        }
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    
    // DexScreener returns an array of pairs for a token
    // Find the pair on our target network with highest liquidity
    const pairs = data.pairs || [];
    const networkPairs = pairs.filter((p: any) => 
      p.chainId?.toLowerCase() === network.toLowerCase()
    );
    
    if (networkPairs.length === 0) {
      return null;
    }
    
    // Sort by liquidity and get the best one
    const bestPair = networkPairs.sort((a: any, b: any) => 
      (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
    )[0];
    
    // Extract useful data
    const tokenData = {
      poolAddress: bestPair.pairAddress,
      symbol: bestPair.baseToken.address.toLowerCase() === contractAddress.toLowerCase()
        ? bestPair.baseToken.symbol
        : bestPair.quoteToken.symbol,
      name: bestPair.baseToken.address.toLowerCase() === contractAddress.toLowerCase()
        ? bestPair.baseToken.name
        : bestPair.quoteToken.name,
      website: null as string | null,
      twitter: null as string | null,
      telegram: null as string | null,
      liquidity: bestPair.liquidity?.usd || 0,
      market_cap: bestPair.marketCap || bestPair.fdv || null // Include market cap or FDV
    };
    
    // Extract social links if available
    if (bestPair.info?.socials) {
      for (const social of bestPair.info.socials) {
        const type = social.type?.toLowerCase();
        if (type === 'website' && !tokenData.website) {
          tokenData.website = social.url;
        } else if (type === 'twitter' && !tokenData.twitter) {
          tokenData.twitter = social.url;
        } else if (type === 'telegram' && !tokenData.telegram) {
          tokenData.telegram = social.url;
        }
      }
    }
    
    // Also check websites array
    if (!tokenData.website && bestPair.info?.websites?.length > 0) {
      // Extract just the URL from the website object
      const websiteObj = bestPair.info.websites[0];
      tokenData.website = typeof websiteObj === 'string' ? websiteObj : websiteObj.url;
    }
    
    return tokenData;
  } catch (error) {
    console.error('Error fetching from DexScreener:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const forwardedFor = request.headers.get('x-forwarded-for');
    const clientIp = forwardedFor ? forwardedFor.split(',')[0] : 'unknown';
    
    // Check rate limit
    if (!checkRateLimit(clientIp)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { contractAddress, network, websiteUrl, whitepaperUrl, whitepaperContent } = body;

    // Validate required fields
    if (!contractAddress || !network) {
      return NextResponse.json(
        { error: 'Contract address and network are required.' },
        { status: 400 }
      );
    }

    // Validate contractAddress is a string
    if (typeof contractAddress !== 'string') {
      return NextResponse.json(
        { error: 'Contract address must be a valid string.' },
        { status: 400 }
      );
    }

    // Validate network is a string
    if (typeof network !== 'string') {
      return NextResponse.json(
        { error: 'Network must be a valid string.' },
        { status: 400 }
      );
    }

    // Normalize network name
    const normalizedNetwork = normalizeNetwork(network);
    
    // Check if it's a native L1 token
    const isNativeToken = contractAddress.startsWith('native:');

    // Validate contract address format (skip for native tokens)
    if (!isNativeToken && !isValidContractAddress(contractAddress, normalizedNetwork)) {
      return NextResponse.json(
        { error: 'Invalid contract address format for the selected network.' },
        { status: 400 }
      );
    }

    // Normalize contract address (keep native: prefix as-is)
    const normalizedAddress = isNativeToken
      ? contractAddress
      : normalizeContractAddress(contractAddress, normalizedNetwork);

    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Supabase credentials not configured');
      return NextResponse.json(
        { error: 'Server configuration error.' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if token already exists in crypto_projects_rated
    const { data: existingToken, error: checkError } = await supabase
      .from('crypto_projects_rated')
      .select('id, symbol, name')
      .eq('contract_address', normalizedAddress)
      .eq('network', normalizedNetwork)
      .single();

    if (existingToken) {
      return NextResponse.json(
        { 
          error: 'Token already exists in our database.',
          tokenId: existingToken.id,
          symbol: existingToken.symbol
        },
        { status: 409 } // Conflict
      );
    }

    let tokenData: any = null;

    if (isNativeToken) {
      // Extract coingecko ID and fetch token data
      const coingeckoId = contractAddress.replace('native:', '');
      console.log(`Fetching native token data for ${coingeckoId} from CoinGecko`);

      const coinGeckoData = await fetchNativeTokenFromCoinGecko(coingeckoId);

      if (!coinGeckoData) {
        return NextResponse.json(
          { error: `Token '${coingeckoId}' not found on CoinGecko. Please verify the CoinGecko ID.` },
          { status: 404 }
        );
      }

      // Use fetched data, with manual overrides if provided
      tokenData = {
        poolAddress: null,
        symbol: coinGeckoData.symbol,
        name: coinGeckoData.name,
        website: websiteUrl || body.websiteUrl || coinGeckoData.website,
        liquidity: 1000000, // Native tokens don't need liquidity check
        market_cap: coinGeckoData.market_cap, // Include market cap from CoinGecko
        isNative: true
      };

      // Validate that we have a website
      if (!tokenData.website) {
        return NextResponse.json(
          {
            error: 'Website URL is required for Layer 1 tokens.',
            needsWebsite: true
          },
          { status: 400 }
        );
      }
    } else {
      // Check if we have CoinGecko data (symbol, name, website) - if so, skip DexScreener
      if (body.symbol && body.name && (websiteUrl || body.websiteUrl)) {
        console.log(`Using CoinGecko data for ${body.symbol} - skipping DexScreener validation`);

        // Try to fetch market cap from CoinGecko for this token
        let cgMarketCap = null;
        try {
          const cgData = await fetchNativeTokenFromCoinGecko(body.symbol.toLowerCase());
          if (cgData?.market_cap) {
            cgMarketCap = cgData.market_cap;
            console.log(`Fetched market cap from CoinGecko: $${cgMarketCap.toLocaleString()}`);
          }
        } catch (error) {
          console.log(`Could not fetch CoinGecko market cap for ${body.symbol}`);
        }

        tokenData = {
          poolAddress: null,
          symbol: body.symbol,
          name: body.name,
          website: websiteUrl || body.websiteUrl,
          liquidity: 1000000, // Skip liquidity check for CoinGecko tokens
          market_cap: cgMarketCap, // Include market cap if found
          isNative: false
        };
      } else {
        // Fetch token data from DexScreener for contract-based tokens
        console.log(`Fetching data for ${normalizedAddress} on ${normalizedNetwork}`);
        tokenData = await fetchTokenDataFromDexScreener(normalizedAddress, normalizedNetwork);

        if (!tokenData) {
          return NextResponse.json(
            { error: 'Token not found on DexScreener. Please ensure the token is listed on a DEX.' },
            { status: 404 }
          );
        }

        // If liquidity is too low, reject
        if (tokenData.liquidity < 100) {
          return NextResponse.json(
            { error: 'Token liquidity too low. Minimum $100 liquidity required.' },
            { status: 400 }
          );
        }

        // If DexScreener didn't provide market cap, try CoinGecko as fallback
        if (!tokenData.market_cap && tokenData.symbol) {
          console.log(`DexScreener has no market cap for ${tokenData.symbol}, trying CoinGecko...`);
          try {
            const cgData = await fetchNativeTokenFromCoinGecko(tokenData.symbol.toLowerCase());
            if (cgData?.market_cap) {
              tokenData.market_cap = cgData.market_cap;
              console.log(`✅ Fetched market cap from CoinGecko: $${cgData.market_cap.toLocaleString()}`);
            }
          } catch (error) {
            console.log(`Could not fetch CoinGecko market cap for ${tokenData.symbol}`);
          }
        }
      }
    }

    // Check if we're providing a manual website URL
    let manualWebsiteUrl = body.websiteUrl;
    if (manualWebsiteUrl) {
      // Normalize the URL - add https:// if missing
      if (!manualWebsiteUrl.startsWith('http://') && !manualWebsiteUrl.startsWith('https://')) {
        manualWebsiteUrl = `https://${manualWebsiteUrl}`;
      }

      // Skip URL testing in serverless environment - just use the URL as-is
      // (URL testing with fetch() is unreliable in Netlify Functions due to timeouts)
      tokenData.website = manualWebsiteUrl;
      console.log(`Manual website URL set: ${manualWebsiteUrl}`);
    }

    // Process whitepaper URL if provided
    let normalizedWhitepaperUrl = null;
    if (whitepaperUrl && whitepaperUrl.trim()) {
      normalizedWhitepaperUrl = whitepaperUrl.trim();
      // Normalize the URL - add https:// if missing
      if (!normalizedWhitepaperUrl.startsWith('http://') && !normalizedWhitepaperUrl.startsWith('https://')) {
        normalizedWhitepaperUrl = `https://${normalizedWhitepaperUrl}`;
      }
      console.log(`Whitepaper URL provided: ${normalizedWhitepaperUrl}`);
    }

    // Process whitepaper content if provided (pasted manually)
    let processedWhitepaperContent = null;
    if (whitepaperContent && whitepaperContent.trim()) {
      // Truncate to 240K chars if needed
      processedWhitepaperContent = whitepaperContent.trim().substring(0, 240000);
      console.log(`Whitepaper content provided: ${processedWhitepaperContent.length} chars`);

      // If content is provided but no URL, set URL to indicate manual provision
      if (!normalizedWhitepaperUrl) {
        normalizedWhitepaperUrl = 'MANUALLY_PROVIDED';
      }
    }

    // If no website at all, return error with needsWebsite flag
    if (!tokenData.website) {
      return NextResponse.json(
        { 
          error: 'This token does not have a website listed on DexScreener.',
          needsWebsite: true,
          symbol: tokenData.symbol,
          liquidity: tokenData.liquidity
        },
        { status: 400 }
      );
    }

    // Call the project-ingestion edge function
    const ingestionUrl = `${supabaseUrl}/functions/v1/project-ingestion`;
    const ingestionResponse = await fetch(ingestionUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contract_address: normalizedAddress,
        network: isNativeToken ? 'other' : normalizedNetwork, // Native tokens use 'other' network
        symbol: tokenData.symbol,
        name: tokenData.name,
        pool_address: tokenData.poolAddress,
        website_url: tokenData.website || 'pending',
        whitepaper_url: normalizedWhitepaperUrl,
        whitepaper_content: processedWhitepaperContent,
        source: 'manual',
        trigger_analysis: !!tokenData.website, // Only trigger if we have a website
        market_cap: tokenData.market_cap // Pass CoinGecko market cap if available
      })
    });

    if (!ingestionResponse.ok) {
      const errorText = await ingestionResponse.text();
      console.error('Ingestion failed:', errorText);
      return NextResponse.json(
        { error: `Ingestion failed: ${errorText.substring(0, 200)}` },
        { status: 500 }
      );
    }

    const ingestionResult = await ingestionResponse.json();

    // Prepare response with appropriate warnings
    const response: any = {
      success: true,
      tokenId: ingestionResult.project_id,
      symbol: tokenData.symbol,
      hasWebsite: !!tokenData.website,
      liquidity: tokenData.liquidity,
      priceUsd: ingestionResult.price_usd,
      marketCap: ingestionResult.market_cap,
      analysisStatus: tokenData.website ? 'pending' : 'not_applicable'
    };

    // We always have a website at this point (either from DexScreener or manual)
    response.message = 'Token added successfully! Website analysis in progress (may take 1-2 minutes).';

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Error in add-token API:', error);
    return NextResponse.json(
      { error: `Unexpected error: ${error?.message || String(error)}` },
      { status: 500 }
    );
  }
}