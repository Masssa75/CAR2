import { NextRequest, NextResponse } from 'next/server';

// Force Node.js runtime to ensure environment variables are available
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const coinId = searchParams.get('coinId');
    const days = searchParams.get('days');

    if (!coinId || !days) {
      return NextResponse.json(
        { error: 'Missing coinId or days parameter' },
        { status: 400 }
      );
    }

    const apiKey = process.env.COINGECKO_API_KEY;
    console.log(`[CoinGecko Proxy] API key present: ${!!apiKey}, coinId: ${coinId}, days: ${days}`);

    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };

    // Use Demo API header (CoinGecko's free tier with API key)
    if (apiKey) {
      headers['x-cg-demo-api-key'] = apiKey;
      console.log(`[CoinGecko Proxy] Added x-cg-demo-api-key header`);
    } else {
      console.warn(`[CoinGecko Proxy] WARNING: No API key found in environment`);
    }

    const url = `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`;
    console.log(`[CoinGecko Proxy] Fetching: ${url}`);

    const response = await fetch(url, { headers });
    console.log(`[CoinGecko Proxy] Response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[CoinGecko Proxy] API error (${response.status}):`, errorText);
      return NextResponse.json(
        { error: `CoinGecko API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log(`[CoinGecko Proxy] Success! Data points: ${data.market_caps?.length || 0}`);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[CoinGecko Proxy] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch chart data' },
      { status: 500 }
    );
  }
}
