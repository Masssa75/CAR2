import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';
export const maxDuration = 300; // 5 minutes

export async function POST(request: NextRequest) {
  try {
    const { projectId, symbol, handle } = await request.json();

    if (!symbol) {
      return NextResponse.json(
        { error: 'Symbol is required' },
        { status: 400 }
      );
    }

    // Call the Supabase edge function
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing');
    }

    const response = await fetch(
      `${supabaseUrl}/functions/v1/x-signal-analyzer-v3-1page`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'analyze',
          symbol,
          handle,
          projectId,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Edge function error:', errorText);
      return NextResponse.json(
        { error: 'Analysis failed', details: errorText },
        { status: response.status }
      );
    }

    // For SSE responses, we'll just return success
    // The actual analysis happens asynchronously on the server
    return NextResponse.json({
      success: true,
      message: 'Twitter analysis started. Results will be available in ~2 minutes.',
    });
  } catch (error: any) {
    console.error('Twitter analysis error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to analyze Twitter' },
      { status: 500 }
    );
  }
}
