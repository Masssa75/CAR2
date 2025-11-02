import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface FlatSignal {
  id: string; // unique ID for the signal (projectId-index)
  projectId: number;
  symbol: string;
  name: string;
  signalText: string;
  signalType: 'x_signal';
  category: string;
  tierScore: number | null;
  signalDate: string; // ISO date string for sorting
  projectTier: string;
  currentMarketCap: number | null;
  logoUrl: string | null;
  projectAgeYears: number | null;
}

// Helper to parse various date formats to ISO string
function parseSignalDate(dateStr: string): string {
  if (!dateStr) return new Date().toISOString();

  try {
    // Handle formats like "Oct 31", "Mar 6", etc.
    const currentYear = new Date().getFullYear();
    const parsedDate = new Date(`${dateStr} ${currentYear}`);

    // Check if date is valid
    if (isNaN(parsedDate.getTime())) {
      console.warn(`Invalid date format: ${dateStr}, using current date`);
      return new Date().toISOString();
    }

    // If parsed date is in the future, assume it's from last year
    if (parsedDate > new Date()) {
      parsedDate.setFullYear(currentYear - 1);
    }

    return parsedDate.toISOString();
  } catch (error) {
    console.warn(`Error parsing date ${dateStr}:`, error);
    return new Date().toISOString();
  }
}

// Convert tier number to score
function tierToScore(tier: number): number {
  switch(tier) {
    case 1: return 90;
    case 2: return 70;
    case 3: return 45;
    case 4: return 15;
    default: return 0;
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period') || 'week'; // today, week, month, all
    const minTier = searchParams.get('minTier'); // 90, 70, 45, 15
    const category = searchParams.get('category'); // partnership, technical_achievement, etc.

    // Fetch all projects with X signals
    const { data: projects, error } = await supabase
      .from('crypto_projects_rated')
      .select('id, symbol, name, x_signals_found, x_analysis, x_tier, current_market_cap, logo_url, project_age_years')
      .not('x_signals_found', 'is', null);

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!projects || projects.length === 0) {
      return NextResponse.json({ signals: [] });
    }

    // Flatten all signals across all projects
    const flatSignals: FlatSignal[] = [];

    projects.forEach((project: any) => {
      const signals = project.x_signals_found || [];
      const signalEvaluations = project.x_analysis?.signal_evaluations || [];

      // Create a map of signal text to tier
      const signalTierMap = new Map<string, number>();
      signalEvaluations.forEach((evaluation: any) => {
        signalTierMap.set(evaluation.signal, evaluation.assigned_tier);
      });

      signals.forEach((signal: any, index: number) => {
        const assignedTier = signalTierMap.get(signal.signal);
        const tierScore = assignedTier ? tierToScore(assignedTier) : null;

        flatSignals.push({
          id: `${project.id}-${index}`,
          projectId: project.id,
          symbol: project.symbol,
          name: project.name,
          signalText: signal.signal,
          signalType: 'x_signal',
          category: signal.category || 'other',
          tierScore,
          signalDate: parseSignalDate(signal.date),
          projectTier: project.x_tier || 'UNKNOWN',
          currentMarketCap: project.current_market_cap,
          logoUrl: project.logo_url,
          projectAgeYears: project.project_age_years
        });
      });
    });

    // Sort by date (newest first)
    flatSignals.sort((a, b) => new Date(b.signalDate).getTime() - new Date(a.signalDate).getTime());

    // Filter by time period
    let filteredSignals = flatSignals;
    const now = new Date();

    if (period === 'today') {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      filteredSignals = flatSignals.filter(s => new Date(s.signalDate) >= startOfDay);
    } else if (period === 'week') {
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filteredSignals = flatSignals.filter(s => new Date(s.signalDate) >= oneWeekAgo);
    } else if (period === 'month') {
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      filteredSignals = flatSignals.filter(s => new Date(s.signalDate) >= oneMonthAgo);
    }

    // Filter by minimum tier score
    if (minTier) {
      const minTierNum = parseInt(minTier);
      filteredSignals = filteredSignals.filter(s => s.tierScore && s.tierScore >= minTierNum);
    }

    // Filter by category
    if (category && category !== 'all') {
      filteredSignals = filteredSignals.filter(s => s.category === category);
    }

    return NextResponse.json({
      signals: filteredSignals,
      total: filteredSignals.length,
      totalProjects: projects.length
    });

  } catch (error) {
    console.error('Error in signals API:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch signals',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
