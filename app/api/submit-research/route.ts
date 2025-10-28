import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symbol, researchMd } = body;

    if (!symbol || !researchMd) {
      return NextResponse.json(
        { error: 'Symbol and research content are required' },
        { status: 400 }
      );
    }

    // Update the project with research
    const { data, error } = await supabase
      .from('crypto_projects_rated')
      .update({
        deep_research_md: researchMd,
        research_analyzed_at: new Date().toISOString()
      })
      .eq('symbol', symbol.toUpperCase())
      .select()
      .single();

    if (error) {
      console.error('Error updating research:', error);
      return NextResponse.json(
        { error: 'Failed to save research' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error in submit-research:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
