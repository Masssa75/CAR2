import { NextRequest, NextResponse } from 'next/server';

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
    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };

    // Use Pro API URL if we have an API key
    const baseUrl = apiKey ? 'https://pro-api.coingecko.com' : 'https://api.coingecko.com';

    if (apiKey) {
      headers['x-cg-pro-api-key'] = apiKey;
    }

    const response = await fetch(
      `${baseUrl}/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`,
      { headers }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[CoinGecko Proxy] API error:`, errorText);
      return NextResponse.json(
        { error: `CoinGecko API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[CoinGecko Proxy] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch chart data' },
      { status: 500 }
    );
  }
}
