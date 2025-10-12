import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const coinId = searchParams.get('coinId') || 'bitcoin';
  const days = searchParams.get('days') || '7';

  const apiKey = process.env.COINGECKO_API_KEY;

  const headers: Record<string, string> = {
    'Accept': 'application/json',
  };

  if (apiKey) {
    headers['x-cg-demo-api-key'] = apiKey;
  }

  const url = `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`;

  // Make the actual request to see what happens
  const response = await fetch(url, { headers });
  const responseText = await response.text();

  let parsed;
  try {
    parsed = JSON.parse(responseText);
  } catch {
    parsed = { raw: responseText };
  }

  return NextResponse.json({
    debug: {
      hasApiKey: !!apiKey,
      apiKeyLength: apiKey?.length || 0,
      apiKeyPrefix: apiKey?.substring(0, 5) || 'none',
      requestUrl: url,
      responseStatus: response.status,
      responseOk: response.ok,
      headersUsed: Object.keys(headers),
    },
    response: parsed,
  });
}
