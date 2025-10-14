import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    // Use service role key for write operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // First, get the current state
    const { data: currentProject, error: fetchError } = await supabase
      .from('crypto_projects_rated')
      .select('is_featured, maybe_featured')
      .eq('id', id)
      .single();

    if (fetchError || !currentProject) {
      console.error('Error fetching project:', fetchError);
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Tri-state cycling logic:
    // Empty (false, false) → Maybe (false, true)
    // Maybe (false, true) → Featured (true, false)
    // Featured (true, false) → Empty (false, false)
    let newIsFeatured = false;
    let newMaybeFeatured = false;

    if (!currentProject.is_featured && !currentProject.maybe_featured) {
      // Empty → Maybe
      newMaybeFeatured = true;
    } else if (!currentProject.is_featured && currentProject.maybe_featured) {
      // Maybe → Featured
      newIsFeatured = true;
    } else if (currentProject.is_featured && !currentProject.maybe_featured) {
      // Featured → Empty
      newIsFeatured = false;
      newMaybeFeatured = false;
    }

    // Update the project
    const { data, error } = await supabase
      .from('crypto_projects_rated')
      .update({
        is_featured: newIsFeatured,
        maybe_featured: newMaybeFeatured
      })
      .eq('id', id)
      .select();

    if (error) {
      console.error('Error updating featured status:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      project: data[0]
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
