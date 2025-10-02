'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { Zap, Filter, Menu, Plus } from 'lucide-react';
import ProgressRing from '@/components/rank/ProgressRing';
import { SignalBasedTooltip } from '@/components/SignalBasedTooltip';
import { WhitepaperTooltip } from '@/components/WhitepaperTooltip';
import { SimpleAddTokenModal } from '@/components/SimpleAddTokenModal';
import RankSearchInput from '@/components/rank/RankSearchInput';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Project {
  symbol: string;
  name: string;
  project_age_years: number | null;
  current_market_cap: number | null;
  website_stage1_tier: 'ALPHA' | 'SOLID' | 'BASIC' | 'TRASH' | null;
  whitepaper_tier: 'ALPHA' | 'SOLID' | 'BASIC' | 'TRASH' | null;
  token_type: 'meme' | 'utility' | 'stablecoin' | null;
}

interface FilterState {
  tokenType: 'all' | 'utility' | 'meme' | 'stablecoin';
  websiteTiers: string[];
  whitepaperTiers: string[];
  maxAge: string;
  maxMcap: string;
}

type SortColumn = 'name' | 'project_age_years' | 'current_market_cap' | 'website_stage1_tier' | 'whitepaper_tier';
type SortDirection = 'asc' | 'desc';

export default function HomePage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [sortColumn, setSortColumn] = useState<SortColumn>('current_market_cap');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [showFilters, setShowFilters] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [hotPicksActive, setHotPicksActive] = useState(false);
  const [showAddTokenModal, setShowAddTokenModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    tokenType: 'all',
    websiteTiers: [],
    whitepaperTiers: ['ALPHA'], // Default: Show only ALPHA whitepapers
    maxAge: '', // No age filter by default (many top projects have NULL ages)
    maxMcap: ''
  });
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetchProjects(1, true);
  }, []);

  // Handle search with debounce
  useEffect(() => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    const timeout = setTimeout(() => {
      fetchProjects(1, true);
    }, 300);

    setSearchTimeout(timeout);

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [searchQuery]);

  // Refetch when filters change
  useEffect(() => {
    fetchProjects(1, true);
  }, [filters]);

  async function fetchProjects(pageNum: number, reset: boolean = false) {
    try {
      if (reset) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      // Build query params
      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: '50',
        sortBy: 'current_market_cap',
        sortOrder: 'desc',
        includeUnverified: 'true'
      });

      // Add search
      if (searchQuery.trim()) {
        params.append('search', searchQuery);
      }

      // Add filters
      if (filters.tokenType !== 'all') {
        params.append('tokenType', filters.tokenType);
      }

      if (filters.websiteTiers.length > 0) {
        params.append('websiteTiers', filters.websiteTiers.join(','));
      }

      if (filters.whitepaperTiers.length > 0) {
        params.append('whitepaperTiers', filters.whitepaperTiers.join(','));
      }

      if (filters.maxAge) {
        const maxAgeValue = parseFloat(filters.maxAge);
        if (!isNaN(maxAgeValue)) {
          params.append('maxAge', maxAgeValue.toString());
        }
      }

      if (filters.maxMcap) {
        const input = filters.maxMcap.toUpperCase().replace(/[$,]/g, '');
        let maxMcapValue = 0;

        if (input.endsWith('K')) {
          maxMcapValue = parseFloat(input.slice(0, -1)) * 1000;
        } else if (input.endsWith('M')) {
          maxMcapValue = parseFloat(input.slice(0, -1)) * 1000000;
        } else if (input.endsWith('B')) {
          maxMcapValue = parseFloat(input.slice(0, -1)) * 1000000000;
        } else {
          maxMcapValue = parseFloat(input);
        }

        if (!isNaN(maxMcapValue) && maxMcapValue > 0) {
          params.append('maxMarketCap', maxMcapValue.toString());
        }
      }

      const response = await fetch(`/api/crypto-projects-rated?${params}`);
      const json = await response.json();

      if (json.error) throw new Error(json.error);

      const newProjects = json.data || [];

      if (reset) {
        setProjects(newProjects);
      } else {
        setProjects(prev => [...prev, ...newProjects]);
      }

      setHasMore(json.pagination?.hasMore || false);
      setPage(pageNum);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  // Infinite scroll observer
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
        fetchProjects(page + 1, false);
      }
    });

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, loadingMore, loading, page]);

  function handleSort(column: SortColumn) {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
    setHotPicksActive(false);
  }

  function calculateHotPicksScore(project: Project): number {
    const tierScores: Record<string, number> = {
      ALPHA: 100,
      SOLID: 70,
      BASIC: 40,
      TRASH: 0,
    };

    const webScore = tierScores[project.website_stage1_tier || 'TRASH'] * 0.35;
    const wpScore = tierScores[project.whitepaper_tier || 'TRASH'] * 0.35;

    // Age score (younger is better)
    const ageYears = project.project_age_years || 10;
    let ageScore = 0;
    if (ageYears < 0.5) ageScore = 100;
    else if (ageYears < 1) ageScore = 80;
    else if (ageYears < 2) ageScore = 60;
    else if (ageYears < 3) ageScore = 40;
    else if (ageYears < 4) ageScore = 20;
    ageScore *= 0.15;

    // MCap score (lower is better)
    const mcap = project.current_market_cap || 10000000000;
    let mcapScore = 0;
    if (mcap < 1000000) mcapScore = 100;
    else if (mcap < 10000000) mcapScore = 85;
    else if (mcap < 50000000) mcapScore = 70;
    else if (mcap < 100000000) mcapScore = 55;
    else if (mcap < 500000000) mcapScore = 40;
    else if (mcap < 1000000000) mcapScore = 25;
    else if (mcap < 5000000000) mcapScore = 10;
    mcapScore *= 0.15;

    return webScore + wpScore + ageScore + mcapScore;
  }

  function toggleHotPicks() {
    setHotPicksActive(!hotPicksActive);
  }

  // Count active filters
  function getActiveFilterCount() {
    let count = 0;
    if (filters.tokenType !== 'all') count++;
    if (filters.websiteTiers.length > 0) count++;
    if (filters.whitepaperTiers.length > 0) count++;
    if (filters.maxAge) count++;
    if (filters.maxMcap) count++;
    return count;
  }

  const activeFilterCount = getActiveFilterCount();

  // All filtering now happens server-side - projects are already filtered
  const filteredProjects = projects;

  const sortedProjects = [...filteredProjects].sort((a, b) => {
    if (hotPicksActive) {
      return calculateHotPicksScore(b) - calculateHotPicksScore(a);
    }

    const aValue = a[sortColumn];
    const bValue = b[sortColumn];

    if (aValue === null || aValue === undefined) return 1;
    if (bValue === null || bValue === undefined) return -1;

    if (sortDirection === 'asc') {
      return aValue < bValue ? -1 : 1;
    } else {
      return aValue > bValue ? -1 : 1;
    }
  });

  function formatAge(years: number | null): string {
    if (years === null || years === undefined) return '—';
    return `${years.toFixed(1)}y`;
  }

  function formatMcap(mcap: number | null): string {
    if (!mcap) return '—';
    if (mcap >= 1000000000) return `$${(mcap / 1000000000).toFixed(1)}B`;
    if (mcap >= 1000000) return `$${(mcap / 1000000).toFixed(0)}M`;
    return `$${(mcap / 1000).toFixed(0)}K`;
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200">
        <div className="flex justify-between items-center px-5 py-4">
          <div className="text-xl font-extrabold">
            Coin<span className="text-emerald-500">Ai</span>Rank
          </div>
          <div className="flex gap-3">
            <RankSearchInput onSearch={setSearchQuery} placeholder="Search symbol or name..." />
            <button
              onClick={toggleHotPicks}
              className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all ${
                hotPicksActive
                  ? 'bg-gradient-to-br from-yellow-300 to-orange-500'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              <Zap
                className={`w-5 h-5 ${hotPicksActive ? 'text-white' : 'text-gray-600'}`}
                strokeWidth={hotPicksActive ? 2.5 : 2}
              />
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="w-9 h-9 flex items-center justify-center bg-gray-100 rounded-lg hover:bg-gray-200 relative"
            >
              <Filter className={`w-5 h-5 ${activeFilterCount > 0 ? 'text-emerald-500' : 'text-gray-600'}`} />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="w-9 h-9 flex items-center justify-center bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              <Menu className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Menu Dropdown */}
        {showMenu && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setShowMenu(false)} />
            <div className="absolute top-16 right-5 z-40 bg-white border border-gray-200 rounded-lg shadow-lg w-48">
              <button
                onClick={() => {
                  setShowMenu(false);
                  setShowAddTokenModal(true);
                }}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-2 text-gray-900"
              >
                <Plus className="w-4 h-4" />
                Submit Project
              </button>
            </div>
          </>
        )}
      </div>

      {/* Main Content Area - Flex Container */}
      <div className="flex flex-1">
        {/* Desktop Filter Sidebar */}
        {showFilters && (
          <div className="hidden md:block w-72 border-r border-gray-200 bg-gray-50 p-5 overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-base font-bold text-gray-900 uppercase tracking-wide">Filters</h3>
              <button
                onClick={() => {
                  // Reset all filters
                  setFilters({
                    tokenType: 'all',
                    websiteTiers: [],
                    whitepaperTiers: [],
                    maxAge: '',
                    maxMcap: ''
                  });
                }}
                className="text-xs text-emerald-500 font-semibold uppercase tracking-wide"
              >
                Reset
              </button>
            </div>

            {/* Token Type */}
            <div className="mb-6">
              <div className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Token Type</div>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => setFilters(prev => ({ ...prev, tokenType: 'all' }))}
                  className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    filters.tokenType === 'all'
                      ? 'bg-emerald-50 text-emerald-500 border-2 border-emerald-500'
                      : 'bg-white text-gray-600 border-2 border-transparent hover:bg-gray-100'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilters(prev => ({ ...prev, tokenType: 'utility' }))}
                  className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    filters.tokenType === 'utility'
                      ? 'bg-emerald-50 text-emerald-500 border-2 border-emerald-500'
                      : 'bg-white text-gray-600 border-2 border-transparent hover:bg-gray-100'
                  }`}
                >
                  Utility
                </button>
                <button
                  onClick={() => setFilters(prev => ({ ...prev, tokenType: 'meme' }))}
                  className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    filters.tokenType === 'meme'
                      ? 'bg-emerald-50 text-emerald-500 border-2 border-emerald-500'
                      : 'bg-white text-gray-600 border-2 border-transparent hover:bg-gray-100'
                  }`}
                >
                  Meme
                </button>
                <button
                  onClick={() => setFilters(prev => ({ ...prev, tokenType: 'stablecoin' }))}
                  className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    filters.tokenType === 'stablecoin'
                      ? 'bg-emerald-50 text-emerald-500 border-2 border-emerald-500'
                      : 'bg-white text-gray-600 border-2 border-transparent hover:bg-gray-100'
                  }`}
                >
                  Stablecoin
                </button>
              </div>
            </div>

            {/* Website Tier */}
            <div className="mb-6">
              <div className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Website Tier</div>
              <div className="flex flex-col gap-2">
                {['ALPHA', 'SOLID', 'BASIC'].map(tier => (
                  <button
                    key={tier}
                    onClick={() => {
                      setFilters(prev => ({
                        ...prev,
                        websiteTiers: prev.websiteTiers.includes(tier)
                          ? prev.websiteTiers.filter(t => t !== tier)
                          : [...prev.websiteTiers, tier]
                      }));
                    }}
                    className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors ${
                      filters.websiteTiers.includes(tier)
                        ? 'bg-emerald-50 text-emerald-500 border-2 border-emerald-500'
                        : 'bg-white text-gray-600 border-2 border-transparent hover:bg-gray-100'
                    }`}
                  >
                    {tier}
                  </button>
                ))}
              </div>
            </div>

            {/* Whitepaper Tier */}
            <div className="mb-6">
              <div className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Whitepaper Tier</div>
              <div className="flex flex-col gap-2">
                {['ALPHA', 'SOLID', 'BASIC'].map(tier => (
                  <button
                    key={tier}
                    onClick={() => {
                      setFilters(prev => ({
                        ...prev,
                        whitepaperTiers: prev.whitepaperTiers.includes(tier)
                          ? prev.whitepaperTiers.filter(t => t !== tier)
                          : [...prev.whitepaperTiers, tier]
                      }));
                    }}
                    className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors ${
                      filters.whitepaperTiers.includes(tier)
                        ? 'bg-emerald-50 text-emerald-500 border-2 border-emerald-500'
                        : 'bg-white text-gray-600 border-2 border-transparent hover:bg-gray-100'
                    }`}
                  >
                    {tier}
                  </button>
                ))}
              </div>
            </div>

            {/* Max Age and Max MCap */}
            <div className="space-y-4">
              <div>
                <div className="text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Max Age</div>
                <input
                  type="text"
                  placeholder="e.g. 2y"
                  value={filters.maxAge}
                  onChange={(e) => setFilters(prev => ({ ...prev, maxAge: e.target.value }))}
                  className="w-full px-2.5 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
              <div>
                <div className="text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Max MCap</div>
                <input
                  type="text"
                  placeholder="e.g. $1B"
                  value={filters.maxMcap}
                  onChange={(e) => setFilters(prev => ({ ...prev, maxMcap: e.target.value }))}
                  className="w-full px-2.5 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Mobile Filter Panel (top dropdown) */}
          {showFilters && (
            <div className="md:hidden bg-white border-b border-gray-200 px-5 py-5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base font-bold text-gray-900">Filters</h3>
                <button
                  onClick={() => {
                    setFilters({
                      tokenType: 'all',
                      websiteTiers: [],
                      whitepaperTiers: [],
                      maxAge: '',
                      maxMcap: ''
                    });
                  }}
                  className="text-sm text-emerald-500 font-semibold"
                >
                  Reset
                </button>
              </div>

              {/* Token Type */}
              <div className="mb-4">
                <div className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Token Type</div>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, tokenType: 'all' }))}
                    className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors ${
                      filters.tokenType === 'all'
                        ? 'bg-emerald-50 text-emerald-500 border-2 border-emerald-500'
                        : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, tokenType: 'utility' }))}
                    className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors ${
                      filters.tokenType === 'utility'
                        ? 'bg-emerald-50 text-emerald-500 border-2 border-emerald-500'
                        : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
                    }`}
                  >
                    Utility
                  </button>
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, tokenType: 'meme' }))}
                    className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors ${
                      filters.tokenType === 'meme'
                        ? 'bg-emerald-50 text-emerald-500 border-2 border-emerald-500'
                        : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
                    }`}
                  >
                    Meme
                  </button>
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, tokenType: 'stablecoin' }))}
                    className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors ${
                      filters.tokenType === 'stablecoin'
                        ? 'bg-emerald-50 text-emerald-500 border-2 border-emerald-500'
                        : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
                    }`}
                  >
                    Stablecoin
                  </button>
                </div>
              </div>

              {/* Website Tier */}
              <div className="mb-4">
                <div className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Website Tier</div>
                <div className="flex gap-2 flex-wrap">
                  {['ALPHA', 'SOLID', 'BASIC'].map(tier => (
                    <button
                      key={tier}
                      onClick={() => {
                        setFilters(prev => ({
                          ...prev,
                          websiteTiers: prev.websiteTiers.includes(tier)
                            ? prev.websiteTiers.filter(t => t !== tier)
                            : [...prev.websiteTiers, tier]
                        }));
                      }}
                      className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors ${
                        filters.websiteTiers.includes(tier)
                          ? 'bg-emerald-50 text-emerald-500 border-2 border-emerald-500'
                          : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
                      }`}
                    >
                      {tier}
                    </button>
                  ))}
                </div>
              </div>

              {/* Whitepaper Tier */}
              <div className="mb-4">
                <div className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Whitepaper Tier</div>
                <div className="flex gap-2 flex-wrap">
                  {['ALPHA', 'SOLID', 'BASIC'].map(tier => (
                    <button
                      key={tier}
                      onClick={() => {
                        setFilters(prev => ({
                          ...prev,
                          whitepaperTiers: prev.whitepaperTiers.includes(tier)
                            ? prev.whitepaperTiers.filter(t => t !== tier)
                            : [...prev.whitepaperTiers, tier]
                        }));
                      }}
                      className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors ${
                        filters.whitepaperTiers.includes(tier)
                          ? 'bg-emerald-50 text-emerald-500 border-2 border-emerald-500'
                          : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
                      }`}
                    >
                      {tier}
                    </button>
                  ))}
                </div>
              </div>

              {/* Max Age and Max MCap */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Max Age</div>
                  <input
                    type="text"
                    placeholder="e.g. 2y"
                    value={filters.maxAge}
                    onChange={(e) => setFilters(prev => ({ ...prev, maxAge: e.target.value }))}
                    className="w-full px-2.5 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Max MCap</div>
                  <input
                    type="text"
                    placeholder="e.g. $1B"
                    value={filters.maxMcap}
                    onChange={(e) => setFilters(prev => ({ ...prev, maxMcap: e.target.value }))}
                    className="w-full px-2.5 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto">
            {/* List Header */}
            <div className="sticky top-0 z-10 grid grid-cols-[2fr_0.8fr_1fr_0.7fr_0.7fr] gap-2 px-5 py-3.5 bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-400 uppercase tracking-wider">
              <div onClick={() => handleSort('name')} className="cursor-pointer flex items-center gap-1">
                Project {sortColumn === 'name' && <span className="text-emerald-500">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
              </div>
              <div onClick={() => handleSort('project_age_years')} className="cursor-pointer flex items-center gap-1">
                Age {sortColumn === 'project_age_years' && <span className="text-emerald-500">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
              </div>
              <div onClick={() => handleSort('current_market_cap')} className="cursor-pointer flex items-center gap-1">
                MCap {!hotPicksActive && sortColumn === 'current_market_cap' && <span className="text-emerald-500">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
              </div>
              <div className="text-center">Web</div>
              <div className="text-center">WP</div>
            </div>

            {/* Projects List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-400">Loading projects...</div>
        </div>
      ) : (
        <div>
          {sortedProjects.map((project) => (
            <div
              key={project.symbol}
              className="grid grid-cols-[2fr_0.8fr_1fr_0.7fr_0.7fr] gap-2 px-5 py-5 border-b border-gray-100 items-center hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => router.push(`/${project.symbol}`)}
            >
              <div>
                <div className="font-bold text-base">{project.symbol}</div>
                <div className="text-sm text-gray-400">{project.name}</div>
              </div>
              <div className="text-sm text-gray-600 font-medium">{formatAge(project.project_age_years)}</div>
              <div className="text-sm text-gray-600 font-medium">{formatMcap(project.current_market_cap)}</div>
              <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
                {project.website_stage1_tier && (
                  <SignalBasedTooltip
                    projectSymbol={project.symbol}
                    isAdmin={false}
                  >
                    <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                      project.website_stage1_tier === 'ALPHA' ? 'bg-emerald-50 text-emerald-600' :
                      project.website_stage1_tier === 'SOLID' ? 'bg-amber-50 text-amber-600' :
                      project.website_stage1_tier === 'BASIC' ? 'bg-orange-50 text-orange-600' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {project.website_stage1_tier}
                    </span>
                  </SignalBasedTooltip>
                )}
              </div>
              <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
                {project.whitepaper_tier && (
                  <WhitepaperTooltip
                    projectSymbol={project.symbol}
                    whitepaperTier={project.whitepaper_tier}
                  >
                    <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                      project.whitepaper_tier === 'ALPHA' ? 'bg-emerald-50 text-emerald-600' :
                      project.whitepaper_tier === 'SOLID' ? 'bg-amber-50 text-amber-600' :
                      project.whitepaper_tier === 'BASIC' ? 'bg-orange-50 text-orange-600' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {project.whitepaper_tier}
                    </span>
                  </WhitepaperTooltip>
                )}
              </div>
            </div>
          ))}

          {/* Infinite Scroll Trigger */}
          {hasMore && (
            <div ref={loadMoreRef} className="flex items-center justify-center py-8">
              {loadingMore ? (
                <div className="text-gray-400">Loading more...</div>
              ) : (
                <div className="h-4"></div>
              )}
            </div>
          )}

          {/* End of results message */}
          {!hasMore && sortedProjects.length > 0 && (
            <div className="flex items-center justify-center py-8 text-gray-400 text-sm">
              End of results
            </div>
          )}
        </div>
      )}
          </div>
        </div>
      </div>

      {/* Add Token Modal */}
      <SimpleAddTokenModal
        isOpen={showAddTokenModal}
        onClose={() => setShowAddTokenModal(false)}
        onSuccess={() => {
          fetchProjects(1, true);
        }}
      />
    </div>
  );
}
