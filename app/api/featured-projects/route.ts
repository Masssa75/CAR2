import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const dynamic = 'force-dynamic';

// Age mapping: 0=1mo, 1=6mo, 2=1y, 3=2y, 4=5y
const ageToMonths: { [key: number]: number } = {
  0: 1,
  1: 6,
  2: 12,
  3: 24,
  4: 60
};

// Market cap mapping: 0=$10M, 1=$50M, 2=$100M, 3=$200M, 4=$500M, 5=$1B+
const mcapToValue: { [key: number]: number } = {
  0: 10_000_000,
  1: 50_000_000,
  2: 100_000_000,
  3: 200_000_000,
  4: 500_000_000,
  5: 1_000_000_000
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const maxAge = parseInt(searchParams.get('maxAge') || '4'); // Default to 5y
    const maxMcap = parseInt(searchParams.get('maxMcap') || '5'); // Default to $1B+

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch featured projects
    let query = supabase
      .from('crypto_projects_rated')
      .select(`
        symbol,
        name,
        age_months,
        market_cap,
        website_tier,
        whitepaper_tier,
        whitepaper_story_analysis,
        website_tier_analysis
      `)
      .eq('is_featured', true)
      .order('age_months', { ascending: true }); // Youngest first

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching featured projects:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ projects: [] });
    }

    // Filter by age and market cap
    const maxAgeMonths = ageToMonths[maxAge] || 60;
    const maxMarketCap = mcapToValue[maxMcap] || Infinity;

    const filteredProjects = data
      .filter(project => {
        // Filter by age
        if (project.age_months && project.age_months > maxAgeMonths) {
          return false;
        }

        // Filter by market cap
        if (project.market_cap && project.market_cap > maxMarketCap) {
          return false;
        }

        return true;
      })
      .map(project => {
        // Extract top signal from website tier analysis
        let topSignal = 'Quality project';
        if (project.website_tier_analysis?.signals?.length > 0) {
          topSignal = project.website_tier_analysis.signals[0];
        }

        // Generate short description from whitepaper analysis
        let description = '';
        if (project.whitepaper_story_analysis?.simple_description) {
          description = project.whitepaper_story_analysis.simple_description;
        }

        // Format market cap
        let marketCapFormatted = 'Market cap unknown';
        if (project.market_cap) {
          const mcap = project.market_cap;
          if (mcap >= 1_000_000_000) {
            marketCapFormatted = `$${(mcap / 1_000_000_000).toFixed(1)}B market cap`;
          } else if (mcap >= 1_000_000) {
            marketCapFormatted = `$${(mcap / 1_000_000).toFixed(1)}M market cap`;
          } else if (mcap >= 1_000) {
            marketCapFormatted = `$${(mcap / 1_000).toFixed(1)}K market cap`;
          } else {
            marketCapFormatted = `$${mcap.toFixed(0)} market cap`;
          }
        }

        // Format age
        let ageFormatted = 'Age unknown';
        if (project.age_months !== null && project.age_months !== undefined) {
          const months = project.age_months;
          if (months < 1) {
            ageFormatted = 'Less than 1 month old';
          } else if (months === 1) {
            ageFormatted = '1 month old';
          } else if (months < 12) {
            ageFormatted = `${Math.round(months)} months old`;
          } else {
            const years = Math.floor(months / 12);
            const remainingMonths = Math.round(months % 12);
            if (remainingMonths === 0) {
              ageFormatted = years === 1 ? '1 year old' : `${years} years old`;
            } else {
              ageFormatted = `${years}y ${remainingMonths}mo old`;
            }
          }
        }

        return {
          symbol: project.symbol,
          name: project.name,
          age: ageFormatted,
          marketCap: marketCapFormatted,
          topSignal,
          description,
          websiteTier: project.website_tier,
          whitepaperTier: project.whitepaper_tier
        };
      });

    return NextResponse.json({
      projects: filteredProjects,
      count: filteredProjects.length
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
