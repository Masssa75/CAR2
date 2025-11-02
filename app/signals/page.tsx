'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Activity, TrendingUp } from 'lucide-react';

interface Signal {
  id: string;
  projectId: number;
  symbol: string;
  name: string;
  signalText: string;
  signalType: 'x_signal';
  category: string;
  tierScore: number | null;
  signalDate: string;
  projectTier: string;
  currentMarketCap: number | null;
  logoUrl: string | null;
  projectAgeYears: number | null;
}

type TimePeriod = 'today' | 'week' | 'month' | 'all';

export default function SignalsPage() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<TimePeriod>('week');
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchSignals();
  }, [period]);

  async function fetchSignals() {
    setLoading(true);
    try {
      const response = await fetch(`/api/signals?period=${period}`);
      const data = await response.json();
      setSignals(data.signals || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Error fetching signals:', error);
    } finally {
      setLoading(false);
    }
  }

  // Get tier badge style
  const getTierBadge = (tier: string) => {
    switch(tier) {
      case 'ALPHA':
        return 'bg-emerald-100 text-emerald-700';
      case 'SOLID':
        return 'bg-amber-100 text-amber-700';
      case 'BASIC':
        return 'bg-orange-100 text-orange-700';
      case 'TRASH':
        return 'bg-gray-100 text-gray-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  // Get score color
  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-emerald-600';
    if (score >= 60) return 'text-amber-600';
    if (score >= 30) return 'text-orange-600';
    return 'text-red-600';
  };

  // Format date
  const formatDate = (isoDate: string) => {
    const date = new Date(isoDate);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-4">
            <Activity className="w-6 h-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Live Signals</h1>
          </div>

          {/* Time Period Tabs */}
          <div className="flex gap-1">
            {(['today', 'week', 'month', 'all'] as TimePeriod[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  period === p
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {p === 'today' ? 'Today' : p === 'week' ? 'This Week' : p === 'month' ? 'This Month' : 'All Time'}
              </button>
            ))}
          </div>

          {/* Stats */}
          {!loading && (
            <div className="mt-3 text-sm text-gray-500">
              {total} signals found
            </div>
          )}
        </div>
      </div>

      {/* Signals Feed */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {loading ? (
          <div className="text-center py-12 text-gray-400">
            Loading signals...
          </div>
        ) : signals.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            No signals found for this period
          </div>
        ) : (
          <div className="space-y-4">
            {signals.map((signal) => (
              <Link
                key={signal.id}
                href={`/${signal.symbol}`}
                className="block p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-start gap-3">
                  {/* Project Logo */}
                  {signal.logoUrl ? (
                    <img
                      src={signal.logoUrl}
                      alt={signal.symbol}
                      className="w-10 h-10 rounded-full flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                      <TrendingUp className="w-5 h-5 text-gray-400" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    {/* Header: Symbol, Tier Badge, Score, Date */}
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="font-bold text-gray-900">{signal.symbol}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getTierBadge(signal.projectTier)}`}>
                        {signal.projectTier}
                      </span>
                      {signal.tierScore !== null && (
                        <span className={`font-bold text-sm ${getScoreColor(signal.tierScore)}`}>
                          [{signal.tierScore}]
                        </span>
                      )}
                      <span className="text-gray-400 text-sm">·</span>
                      <span className="text-gray-500 text-sm">{formatDate(signal.signalDate)}</span>
                    </div>

                    {/* Signal Text */}
                    <p className="text-gray-700 text-sm mb-2">{signal.signalText}</p>

                    {/* Category Tag */}
                    <span className="inline-block px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                      {signal.category.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
