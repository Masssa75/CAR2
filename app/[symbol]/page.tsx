'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ExternalLink, Twitter, Send } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import MarketCapChart from '@/components/MarketCapChart';

interface SignalEvaluation {
  signal: string;
  assigned_tier: number;
  reasoning: string;
}

interface Project {
  symbol: string;
  name: string;
  project_age_years: number;
  current_market_cap: number;
  website_url: string;
  twitter_url: string;
  logo_url: string | null;
  coingecko_id: string | null;
  website_stage1_tier: string;
  whitepaper_tier: string;
  website_stage1_analysis: {
    signal_evaluations?: SignalEvaluation[];
    strongest_signal?: string;
  };
  whitepaper_story_analysis: {
    simple_description?: string;
    vision_story?: string;
    innovation_story?: string;
    market_story?: string;
    team_story?: string;
    decentralization_story?: string;
    critical_flaw?: string;
    risk_story?: string;
    likely_outcome?: string;
    content_breakdown?: string;
    character_assessment?: string;
    red_flags?: string;
  };
}

// Convert tier to display score
function tierToScore(tier: number): number {
  const scoreMap: { [key: number]: number } = {
    1: 90, // ALPHA
    2: 70, // SOLID
    3: 50, // BASIC
    4: 30, // TRASH
  };
  return scoreMap[tier] || 50;
}

// Get color for score
function getScoreColor(score: number): string {
  if (score >= 85) return '#059669'; // green
  if (score >= 65) return '#d97706'; // orange
  return '#999'; // gray
}

export default function ProjectDetailPage({ params }: { params: Promise<{ symbol: string }> }) {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [symbol, setSymbol] = useState<string>('');
  const router = useRouter();

  useEffect(() => {
    // Unwrap params promise
    params.then((p) => {
      setSymbol(p.symbol);
    });
  }, [params]);

  useEffect(() => {
    if (symbol) {
      fetchProject();
    }
  }, [symbol]);

  const fetchProject = async () => {
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { data, error } = await supabase
        .from('crypto_projects_rated')
        .select('*')
        .eq('symbol', symbol)
        .eq('is_featured', true)
        .limit(1);

      if (error) throw error;
      if (!data || data.length === 0) throw new Error('Project not found');

      setProject(data[0]);
    } catch (err: any) {
      console.error('Error fetching project:', err);
      setError(err.message || 'Failed to load project');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-red-500">{error || 'Project not found'}</div>
      </div>
    );
  }

  const analysis = project.whitepaper_story_analysis || {};
  const signals = project.website_stage1_analysis?.signal_evaluations || [];

  // Format age
  const ageYears = project.project_age_years || 0;
  let ageFormatted = 'Age unknown';
  if (ageYears < 1) {
    const months = Math.round(ageYears * 12);
    ageFormatted = months === 1 ? '1 month old' : `${months} months old`;
  } else {
    const wholeYears = Math.floor(ageYears);
    const remainingMonths = Math.round((ageYears - wholeYears) * 12);
    if (remainingMonths === 0) {
      ageFormatted = wholeYears === 1 ? '1 year old' : `${wholeYears} years old`;
    } else {
      ageFormatted = `${wholeYears}y ${remainingMonths}mo old`;
    }
  }

  // Format market cap
  const mcap = project.current_market_cap || 0;
  let mcapFormatted = 'Market cap unknown';
  if (mcap >= 1_000_000_000) {
    mcapFormatted = `$${(mcap / 1_000_000_000).toFixed(1)}B market cap`;
  } else if (mcap >= 1_000_000) {
    mcapFormatted = `$${(mcap / 1_000_000).toFixed(1)}M market cap`;
  }

  // CoinGecko doesn't allow iframe embedding of their main site
  // We'll use a link to view the chart instead
  const coinGeckoUrl = project.coingecko_id
    ? `https://www.coingecko.com/en/coins/${project.coingecko_id}`
    : `https://www.coingecko.com/en/coins/${project.symbol.toLowerCase()}`;

  return (
    <div className="min-h-screen bg-white">
      <style jsx global>{`
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif;
          background: #fff;
          color: #000;
          line-height: 1.4;
        }
      `}</style>

      <div className="max-w-[420px] mx-auto">
        {/* Header */}
        <div className="px-4 py-4 border-b border-[#ddd] flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="text-gray-600 hover:text-[#ff6600] transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1 text-base font-bold">
            Coin<span className="text-[#ff6600]">Ai</span>Rank
          </div>
          <a
            href="https://t.me/+BfehJPPT2zU1NzE1"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#0088cc]"
          >
            <Send size={20} />
          </a>
        </div>

        {/* Project Header */}
        <div className="px-4 py-4 border-b border-[#eee]">
          <div className="flex items-center gap-3 mb-2">
            {/* Project Logo */}
            {project.logo_url ? (
              <img
                src={project.logo_url}
                alt={`${project.name} logo`}
                className="w-12 h-12 rounded-full flex-shrink-0"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gray-200 flex-shrink-0 flex items-center justify-center text-sm font-bold text-gray-500">
                {project.symbol.substring(0, 2).toUpperCase()}
              </div>
            )}

            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold">{project.name}</h2>
                <div className="flex gap-2">
                  {project.website_url && (
                    <a
                      href={project.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-[#ff6600] transition-colors"
                    >
                      <ExternalLink size={16} />
                    </a>
                  )}
                  {project.twitter_url && (
                    <a
                      href={project.twitter_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-[#ff6600] transition-colors"
                    >
                      <Twitter size={16} />
                    </a>
                  )}
                </div>
              </div>
              <div className="text-[13px] text-[#999] mt-1">
                <span className="mr-3">{ageFormatted}</span>
                <span>{mcapFormatted}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Signals Section */}
        <div className="px-4 py-5 border-b border-[#eee]">
          <h3 className="text-[11px] uppercase font-bold text-[#999] tracking-wide mb-3">
            Key Signals
          </h3>
          {signals.length === 0 ? (
            <div className="text-[13px] text-gray-500 italic">
              No signal evaluations available for this project.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {signals.slice(0, 5).map((sig, idx) => {
                const score = tierToScore(sig.assigned_tier);
                const color = getScoreColor(score);
                const isTop = idx === 0;

                if (isTop) {
                  return (
                    <div
                      key={idx}
                      className="bg-[#059669] text-white px-3 py-2.5 rounded border-l-4 border-[#047857]"
                    >
                      <div className="flex gap-2 items-start">
                        <div className="flex-1 text-[13px] font-semibold leading-[1.5] break-words">
                          ⚡ {sig.signal}
                        </div>
                        <div className="text-[12px] font-bold flex-shrink-0">[{score}]</div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={idx}
                    className="bg-[#f6f6ef] px-3 py-2.5 rounded border-l-4"
                    style={{ borderLeftColor: color }}
                  >
                    <div className="flex gap-2 items-start">
                      <div className="flex-1 text-[13px] leading-[1.5] text-[#333] break-words">
                        {sig.signal}
                      </div>
                      <div
                        className="text-[12px] font-bold flex-shrink-0"
                        style={{ color }}
                      >
                        [{score}]
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Market Cap Chart Section */}
        <div className="px-4 py-5 border-b border-[#eee]">
          <h3 className="text-[11px] uppercase font-bold text-[#999] tracking-wide mb-3">
            Market Data
          </h3>
          <MarketCapChart
            coinGeckoId={project.coingecko_id || project.symbol.toLowerCase()}
            currentMarketCap={project.current_market_cap}
          />
        </div>

        {/* Whitepaper Analysis */}
        <div className="px-4 py-5">
          <h3 className="text-[11px] uppercase font-bold text-[#999] tracking-wide mb-3">
            Whitepaper Analysis
          </h3>

          {!analysis.vision_story && !analysis.innovation_story && !analysis.market_story &&
           !analysis.team_story && !analysis.decentralization_story && !analysis.critical_flaw &&
           !analysis.risk_story && !analysis.likely_outcome && !analysis.character_assessment &&
           !analysis.simple_description ? (
            <div className="text-[13px] text-gray-500 italic">
              No whitepaper analysis available for this project.
            </div>
          ) : (
            <div className="space-y-4">
              {analysis.simple_description && (
                <div>
                  <h4 className="text-[15px] font-semibold mb-2">Overview</h4>
                  <p className="text-[14px] leading-relaxed text-[#333]">
                    {analysis.simple_description}
                  </p>
                </div>
              )}

              {analysis.vision_story && (
                <div>
                  <h4 className="text-[15px] font-semibold mb-2">Vision</h4>
                  <p className="text-[14px] leading-relaxed text-[#333] whitespace-pre-wrap">
                    {analysis.vision_story}
                  </p>
                </div>
              )}

              {analysis.innovation_story && (
                <div>
                  <h4 className="text-[15px] font-semibold mb-2">Innovation</h4>
                  <p className="text-[14px] leading-relaxed text-[#333] whitespace-pre-wrap">
                    {analysis.innovation_story}
                  </p>
                </div>
              )}

              {analysis.market_story && (
                <div>
                  <h4 className="text-[15px] font-semibold mb-2">Market Position</h4>
                  <p className="text-[14px] leading-relaxed text-[#333] whitespace-pre-wrap">
                    {analysis.market_story}
                  </p>
                </div>
              )}

              {analysis.team_story && (
                <div>
                  <h4 className="text-[15px] font-semibold mb-2">Team Assessment</h4>
                  <p className="text-[14px] leading-relaxed text-[#333] whitespace-pre-wrap">
                    {analysis.team_story}
                  </p>
                </div>
              )}

              {analysis.decentralization_story && (
                <div>
                  <h4 className="text-[15px] font-semibold mb-2">Decentralization</h4>
                  <p className="text-[14px] leading-relaxed text-[#333] whitespace-pre-wrap">
                    {analysis.decentralization_story}
                  </p>
                </div>
              )}

              {analysis.critical_flaw && (
                <div>
                  <h4 className="text-[15px] font-semibold mb-2 text-orange-600">
                    Critical Flaw
                  </h4>
                  <p className="text-[14px] leading-relaxed text-[#333] whitespace-pre-wrap">
                    {analysis.critical_flaw}
                  </p>
                </div>
              )}

              {analysis.risk_story && (
                <div>
                  <h4 className="text-[15px] font-semibold mb-2">Risk Analysis</h4>
                  <p className="text-[14px] leading-relaxed text-[#333] whitespace-pre-wrap">
                    {analysis.risk_story}
                  </p>
                </div>
              )}

              {analysis.likely_outcome && (
                <div>
                  <h4 className="text-[15px] font-semibold mb-2">Likely Outcomes</h4>
                  <p className="text-[14px] leading-relaxed text-[#333] whitespace-pre-wrap">
                    {analysis.likely_outcome}
                  </p>
                </div>
              )}

              {analysis.character_assessment && (
                <div>
                  <h4 className="text-[15px] font-semibold mb-2">Legitimacy Verdict</h4>
                  <p className="text-[14px] leading-relaxed text-[#333] whitespace-pre-wrap">
                    {analysis.character_assessment}
                  </p>
                </div>
              )}

              {analysis.red_flags && (
                <div>
                  <h4 className="text-[15px] font-semibold mb-2 text-red-600">Red Flags</h4>
                  <p className="text-[14px] leading-relaxed text-[#333] whitespace-pre-wrap">
                    {analysis.red_flags}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
