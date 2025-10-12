import { NextResponse } from 'next/server';

export async function GET() {
  const apiKey = process.env.COINGECKO_API_KEY;

  return NextResponse.json({
    hasApiKey: !!apiKey,
    keyLength: apiKey?.length || 0,
    keyPrefix: apiKey?.substring(0, 3) || 'none',
    allEnvKeys: Object.keys(process.env).filter(k => k.includes('COIN') || k.includes('GECKO')),
  });
}
