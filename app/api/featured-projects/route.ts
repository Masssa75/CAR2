import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const dynamic = 'force-dynamic';

// Age mapping: 0=1mo, 1=6mo, 2=1y, 3=2y, 4=5y
const ageToYears: { [key: number]: number } = {
  0: 1/12,    // 1 month = 0.083 years
  1: 0.5,     // 6 months = 0.5 years
  2: 1,       // 1 year
  3: 2,       // 2 years
  4: 5        // 5 years
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
        project_age_years,
        current_market_cap,
        website_stage1_tier,
        whitepaper_tier,
        website_stage1_analysis,
        one_liner,
        website_url,
        twitter_url
      `)
      .eq('is_featured', true)
      .order('project_age_years', { ascending: true }); // Youngest first

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching featured projects:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ projects: [] });
    }

    // Filter by age and market cap
    const maxAgeYears = ageToYears[maxAge] || 5;
    const maxMarketCap = mcapToValue[maxMcap] || Infinity;

    const filteredProjects = data
      .filter(project => {
        // Filter by age
        if (project.project_age_years && project.project_age_years > maxAgeYears) {
          return false;
        }

        // Filter by market cap
        if (project.current_market_cap && project.current_market_cap > maxMarketCap) {
          return false;
        }

        return true;
      })
      .map(project => {
        // Extract top signal from website_stage1_analysis.strongest_signal
        let topSignal = 'Quality project';
        if (project.website_stage1_analysis?.strongest_signal) {
          topSignal = project.website_stage1_analysis.strongest_signal;
        }

        // Use one_liner for short description (60 chars from website analyzer)
        let description = project.one_liner || '';

        // Format market cap
        let marketCapFormatted = 'Market cap unknown';
        if (project.current_market_cap) {
          const mcap = project.current_market_cap;
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
        if (project.project_age_years !== null && project.project_age_years !== undefined) {
          const years = project.project_age_years;
          if (years < 1/12) {
            ageFormatted = 'Less than 1 month old';
          } else if (years < 1) {
            const months = Math.round(years * 12);
            ageFormatted = months === 1 ? '1 month old' : `${months} months old`;
          } else {
            const wholeYears = Math.floor(years);
            const remainingMonths = Math.round((years - wholeYears) * 12);
            if (remainingMonths === 0) {
              ageFormatted = wholeYears === 1 ? '1 year old' : `${wholeYears} years old`;
            } else {
              ageFormatted = `${wholeYears}y ${remainingMonths}mo old`;
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
          websiteTier: project.website_stage1_tier,
          whitepaperTier: project.whitepaper_tier,
          websiteUrl: project.website_url,
          twitterUrl: project.twitter_url
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
