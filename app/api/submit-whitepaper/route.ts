import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symbol, whitepaper_url, whitepaper_content } = body;

    if (!symbol) {
      return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
    }

    if (!whitepaper_url && !whitepaper_content) {
      return NextResponse.json(
        { error: 'Either whitepaper_url or whitepaper_content is required' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get project ID first
    const { data: project, error: projectError } = await supabase
      .from('crypto_projects_rated')
      .select('id')
      .eq('symbol', symbol.toUpperCase())
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Update the project with the whitepaper URL if provided
    if (whitepaper_url) {
      const { error: updateError } = await supabase
        .from('crypto_projects_rated')
        .update({ whitepaper_url })
        .eq('symbol', symbol.toUpperCase());

      if (updateError) {
        console.error('Error updating whitepaper URL:', updateError);
        return NextResponse.json(
          { error: 'Failed to update whitepaper URL' },
          { status: 500 }
        );
      }
    }

    // If whitepaper content was provided, save it directly
    if (whitepaper_content) {
      // Save content to whitepaper_content table
      const { error: contentError } = await supabase
        .from('whitepaper_content')
        .upsert({
          project_id: project.id,
          content: whitepaper_content,
          content_length: whitepaper_content.length,
          extraction_method: 'manual_paste',
          extracted_at: new Date().toISOString()
        }, {
          onConflict: 'project_id'
        });

      if (contentError) {
        console.error('Error saving whitepaper content:', contentError);
        return NextResponse.json(
          { error: 'Failed to save whitepaper content' },
          { status: 500 }
        );
      }
    }

    // Trigger whitepaper analysis asynchronously (fire-and-forget)
    const whitepaperFetcherUrl = `${supabaseUrl}/functions/v1/whitepaper-fetcher`;

    // Don't await - let it run in background
    fetch(whitepaperFetcherUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        projectId: project.id,
        skipAnalysis: false
      })
    }).catch(fetchError => {
      console.error('Error triggering whitepaper analysis:', fetchError);
    });

    return NextResponse.json({
      success: true,
      message: 'Whitepaper submitted successfully. Analysis in progress.',
      project_id: project.id
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
