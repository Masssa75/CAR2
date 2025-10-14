'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { Zap, Filter, Menu, Plus, Gem, Clock, List, X } from 'lucide-react';
import ProgressRing from '@/components/rank/ProgressRing';
import { SignalBasedTooltip } from '@/components/SignalBasedTooltip';
import { WhitepaperTooltip } from '@/components/WhitepaperTooltip';
import { SimpleAddTokenModal } from '@/components/SimpleAddTokenModal';
import { ProjectActionMenu } from '@/components/ProjectActionMenu';
import { AddWhitepaperModal } from '@/components/AddWhitepaperModal';
import RankSearchInput from '@/components/rank/RankSearchInput';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Signal {
  signal: string;
  importance?: string;
  rarity_estimate?: string;
  strength_score?: number;
  score_reasoning?: string;
  similar_to?: string;
}

interface RedFlag {
  flag: string;
  severity: 'high' | 'medium' | 'low';
  evidence?: string;
}

interface AnalysisError {
  failed_at: string;
  error: string;
  attempt: number;
}

interface Project {
  id: number;
  symbol: string;
  name: string;
  project_age_years: number | null;
  current_market_cap: number | null;
  website_stage1_tier: 'ALPHA' | 'SOLID' | 'BASIC' | 'TRASH' | null;
  whitepaper_tier: 'ALPHA' | 'SOLID' | 'BASIC' | 'TRASH' | null;
  token_type: 'meme' | 'utility' | 'stablecoin' | null;
  source?: 'manual' | 'coinmarketcap' | 'coingecko' | 'coingecko_top1000' | 'token_discovery' | 'api' | null;
  created_at?: string;
  is_featured?: boolean;
  maybe_featured?: boolean;
  is_dismissed?: boolean;
  website_stage1_analysis?: {
    signals_found?: Signal[];
    red_flags?: RedFlag[];
    project_description?: string;
    [key: string]: any;
  };
  whitepaper_url?: string;
  whitepaper_story_analysis?: any;
  whitepaper_phase2_comparison?: any;
  website_url?: string;
  coingecko_id?: string;
  analysis_errors?: {
    [key: string]: AnalysisError;
  };
}

interface FilterState {
  tokenType: 'all' | 'utility' | 'meme' | 'stablecoin';
  websiteTiers: string[];
  whitepaperTiers: string[];
  maxAge: string;
  maxMcap: string;
}

type SortColumn = 'name' | 'project_age_years' | 'current_market_cap' | 'website_stage1_tier' | 'whitepaper_tier' | 'created_at';
type SortDirection = 'asc' | 'desc';
type ViewMode = 'gem' | 'latest' | 'all' | null;

export default function HomePage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [sortColumn, setSortColumn] = useState<SortColumn>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showViewModeDropdown, setShowViewModeDropdown] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('latest');
  const [hotPicksActive, setHotPicksActive] = useState(false);
  const [showAddTokenModal, setShowAddTokenModal] = useState(false);
  const [showAddWhitepaperModal, setShowAddWhitepaperModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<{ symbol: string; name: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [hideDismissed, setHideDismissed] = useState(true);
  const [filters, setFilters] = useState<FilterState>({
    tokenType: 'all',
    websiteTiers: [],
    whitepaperTiers: [],
    maxAge: '',
    maxMcap: ''
  });
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // Set filters open on desktop by default
  useEffect(() => {
    const checkScreenSize = () => {
      setShowFilters(window.innerWidth >= 768); // md breakpoint
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);

    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

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

  // Detect manual filter changes and deactivate view mode
  const filtersRef = useRef(filters);
  useEffect(() => {
    // Check if filters changed manually (not from applyViewMode)
    const prevFilters = filtersRef.current;
    if (
      viewMode &&
      (prevFilters.tokenType !== filters.tokenType ||
        JSON.stringify(prevFilters.websiteTiers) !== JSON.stringify(filters.websiteTiers) ||
        JSON.stringify(prevFilters.whitepaperTiers) !== JSON.stringify(filters.whitepaperTiers) ||
        prevFilters.maxAge !== filters.maxAge ||
        prevFilters.maxMcap !== filters.maxMcap)
    ) {
      setViewMode(null);
    }
    filtersRef.current = filters;
  }, [filters]);

  // Refetch when filters, sort, or hideDismissed changes
  useEffect(() => {
    fetchProjects(1, true);
  }, [filters, sortColumn, sortDirection, hideDismissed]);

  async function fetchProjects(pageNum: number, reset: boolean = false) {
    try {
      if (reset) {
        setLoading(true);
        setProjects([]); // Clear old projects immediately to prevent visual glitch
      } else {
        setLoadingMore(true);
      }

      // Build query params
      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: '50',
        sortBy: sortColumn,
        sortOrder: sortDirection,
        includeUnverified: 'true'
      });

      // Add search
      const hasSearch = searchQuery.trim().length > 0;
      if (hasSearch) {
        params.append('search', searchQuery);
      }

      // Add hideDismissed filter
      if (hideDismissed) {
        params.append('hideDismissed', 'true');
      }

      // Add filters (only when NOT searching - search overrides all filters)
      if (!hasSearch) {
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

  async function toggleFeatured(id: number) {
    try {
      const response = await fetch('/api/toggle-featured', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });

      const json = await response.json();

      if (json.error) {
        console.error('Error toggling featured:', json.error);
        alert('Failed to update featured status');
      } else {
        // Update with the new state from server
        setProjects(prev =>
          prev.map(p => p.id === id ? {
            ...p,
            is_featured: json.project.is_featured,
            maybe_featured: json.project.maybe_featured
          } : p)
        );
      }
    } catch (error) {
      console.error('Error toggling featured:', error);
      alert('Failed to update featured status');
    }
  }

  async function toggleDismissed(id: number, isDismissed: boolean) {
    try {
      // Optimistic update - remove from list if hiding dismissed
      if (isDismissed && hideDismissed) {
        setProjects(prev => prev.filter(p => p.id !== id));
      } else {
        setProjects(prev =>
          prev.map(p => p.id === id ? { ...p, is_dismissed: isDismissed } : p)
        );
      }

      const response = await fetch('/api/toggle-dismissed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_dismissed: isDismissed })
      });

      const json = await response.json();

      if (json.error) {
        // Revert on error
        console.error('Error toggling dismissed:', json.error);
        alert('Failed to update dismissed status');
        // Refetch to restore correct state
        fetchProjects(1, true);
      }
    } catch (error) {
      console.error('Error toggling dismissed:', error);
      alert('Failed to update dismissed status');
      // Refetch to restore correct state
      fetchProjects(1, true);
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
    setViewMode(null); // Deactivate view mode when manually sorting
  }

  function applyViewMode(mode: ViewMode) {
    setViewMode(mode);
    setShowViewModeDropdown(false);

    if (mode === 'gem') {
      // Gem mode: age ≤5y, whitepaper ALPHA, sort by youngest
      setFilters({
        tokenType: 'all',
        websiteTiers: [],
        whitepaperTiers: ['ALPHA'],
        maxAge: '5',
        maxMcap: ''
      });
      setSortColumn('project_age_years');
      setSortDirection('asc');
    } else if (mode === 'latest') {
      // Latest mode: clear filters, sort by newest added
      setFilters({
        tokenType: 'all',
        websiteTiers: [],
        whitepaperTiers: [],
        maxAge: '',
        maxMcap: ''
      });
      setSortColumn('created_at');
      setSortDirection('desc');
    } else if (mode === 'all') {
      // All mode: clear filters, sort by market cap
      setFilters({
        tokenType: 'all',
        websiteTiers: [],
        whitepaperTiers: [],
        maxAge: '',
        maxMcap: ''
      });
      setSortColumn('current_market_cap');
      setSortDirection('desc');
    }
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

  // All filtering and sorting now happens server-side
  const filteredProjects = projects;

  // Only apply client-side sorting for Hot Picks
  const sortedProjects = hotPicksActive
    ? [...filteredProjects].sort((a, b) => calculateHotPicksScore(b) - calculateHotPicksScore(a))
    : filteredProjects;

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

  function getSourceBadge(source: string | null | undefined): { label: string; color: string } | null {
    if (!source) return null;

    switch (source) {
      case 'coinmarketcap':
        return { label: 'CMC', color: 'bg-orange-100 text-orange-600' };
      case 'coingecko':
        return { label: 'CG', color: 'bg-green-100 text-green-600' };
      case 'coingecko_top1000':
        return { label: 'CG Top1K', color: 'bg-green-100 text-green-600' };
      case 'manual':
        return { label: 'Manual', color: 'bg-blue-100 text-blue-600' };
      case 'token_discovery':
        return { label: 'Discovery', color: 'bg-purple-100 text-purple-600' };
      case 'api':
        return { label: 'API', color: 'bg-gray-100 text-gray-600' };
      default:
        return null;
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200">
        <div className="flex justify-between items-center px-5 py-4">
          <div className="text-xl font-extrabold">
            Coin<span className="text-emerald-500">Ai</span>Rank
          </div>
          <div className="flex gap-3 items-center">
            <RankSearchInput onSearch={setSearchQuery} placeholder="Search symbol or name..." />

            {/* View Mode Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowViewModeDropdown(!showViewModeDropdown)}
                className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all ${
                  viewMode
                    ? 'bg-gradient-to-br from-emerald-400 to-emerald-600'
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                {viewMode === 'gem' && <Gem className="w-5 h-5 text-white" strokeWidth={2.5} />}
                {viewMode === 'latest' && <Clock className="w-5 h-5 text-white" strokeWidth={2.5} />}
                {viewMode === 'all' && <List className="w-5 h-5 text-white" strokeWidth={2.5} />}
                {!viewMode && <Gem className="w-5 h-5 text-gray-600" strokeWidth={2} />}
              </button>

              {/* View Mode Dropdown Menu */}
              {showViewModeDropdown && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowViewModeDropdown(false)} />
                  <div className="absolute top-12 right-0 z-40 bg-white border border-gray-200 rounded-lg shadow-lg w-40">
                    <button
                      onClick={() => applyViewMode('gem')}
                      className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-2 ${
                        viewMode === 'gem' ? 'text-emerald-600 font-semibold' : 'text-gray-900'
                      }`}
                    >
                      <Gem className="w-4 h-4" />
                      Gem
                    </button>
                    <button
                      onClick={() => applyViewMode('latest')}
                      className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-2 ${
                        viewMode === 'latest' ? 'text-emerald-600 font-semibold' : 'text-gray-900'
                      }`}
                    >
                      <Clock className="w-4 h-4" />
                      Latest
                    </button>
                    <button
                      onClick={() => applyViewMode('all')}
                      className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-2 ${
                        viewMode === 'all' ? 'text-emerald-600 font-semibold' : 'text-gray-900'
                      }`}
                    >
                      <List className="w-4 h-4" />
                      All
                    </button>
                  </div>
                </>
              )}
            </div>

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
            <div className="absolute top-16 right-5 z-40 bg-white border border-gray-200 rounded-lg shadow-lg w-56">
              <button
                onClick={() => {
                  setShowMenu(false);
                  setShowAddTokenModal(true);
                }}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-2 text-gray-900 border-b border-gray-100"
              >
                <Plus className="w-4 h-4" />
                Submit Project
              </button>
              <label
                className="w-full px-4 py-3 flex items-center gap-2 text-gray-900 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  type="checkbox"
                  checked={hideDismissed}
                  onChange={(e) => setHideDismissed(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                />
                <span className="text-sm font-medium">Hide dismissed</span>
              </label>
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
            <div className="sticky top-0 z-10 grid grid-cols-[0.4fr_0.4fr_2fr_0.3fr_0.8fr_1fr_0.7fr_0.7fr_0.3fr_0.5fr] gap-2 px-5 py-3.5 bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-400 uppercase tracking-wider">
              <div className="text-center">★</div>
              <div className="text-center">✕</div>
              <div onClick={() => handleSort('name')} className="cursor-pointer flex items-center gap-1">
                Project {sortColumn === 'name' && <span className="text-emerald-500">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
              </div>
              <div></div>
              <div onClick={() => handleSort('project_age_years')} className="cursor-pointer flex items-center gap-1">
                Age {sortColumn === 'project_age_years' && <span className="text-emerald-500">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
              </div>
              <div onClick={() => handleSort('current_market_cap')} className="cursor-pointer flex items-center gap-1">
                MCap {!hotPicksActive && sortColumn === 'current_market_cap' && <span className="text-emerald-500">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
              </div>
              <div className="text-center">Web</div>
              <div className="text-center">WP</div>
              <div className="text-center"></div>
              <div className="text-center"></div>
            </div>

            {/* Projects List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-400">Loading projects...</div>
        </div>
      ) : sortedProjects.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-400">No projects found</div>
        </div>
      ) : (
        <div>
          {sortedProjects.map((project) => (
            <div
              key={project.symbol}
              className="grid grid-cols-[0.4fr_0.4fr_2fr_0.3fr_0.8fr_1fr_0.7fr_0.7fr_0.3fr_0.5fr] gap-2 px-5 py-5 border-b border-gray-100 items-center hover:bg-gray-50 transition-colors"
            >
              <div className="flex justify-center">
                <input
                  type="checkbox"
                  checked={project.is_featured || project.maybe_featured || false}
                  onChange={(e) => {
                    e.stopPropagation();
                    toggleFeatured(project.id);
                  }}
                  className={`w-4 h-4 rounded focus:ring-2 cursor-pointer transition-colors ${
                    project.is_featured
                      ? 'accent-emerald-600 focus:ring-emerald-500'
                      : project.maybe_featured
                      ? 'accent-orange-500 focus:ring-orange-400'
                      : 'accent-gray-300 focus:ring-gray-400'
                  }`}
                  title={
                    project.is_featured
                      ? 'Featured (shows on public page)'
                      : project.maybe_featured
                      ? 'Maybe (review later)'
                      : 'Not reviewed'
                  }
                />
              </div>
              <div className="flex justify-center">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleDismissed(project.id, true);
                  }}
                  className="w-6 h-6 flex items-center justify-center rounded hover:bg-red-100 text-gray-400 hover:text-red-600 transition-colors"
                  title="Dismiss project"
                >
                  <X className="w-4 h-4" strokeWidth={2.5} />
                </button>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <div
                    className="font-bold text-base cursor-pointer hover:text-emerald-600 transition-colors"
                    onClick={() => router.push(`/${project.symbol}`)}
                  >
                    {project.symbol}
                  </div>
                  {(() => {
                    const badge = getSourceBadge(project.source);
                    if (!badge) return null;

                    const createdDate = project.created_at
                      ? new Date(project.created_at).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit'
                        })
                      : 'Unknown';

                    return (
                      <div className="relative group">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-help ${badge.color}`}>
                          {badge.label}
                        </span>
                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1.5 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-lg">
                          Ingested: {createdDate}
                        </div>
                      </div>
                    );
                  })()}
                </div>
                <div className="text-sm text-gray-400">{project.name}</div>
              </div>
              <div className="flex items-start gap-1 justify-center pt-1" onClick={(e) => e.stopPropagation()}>
                {project.website_url && (
                  <a
                    href={project.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-300 hover:text-emerald-600 transition-colors"
                    title="Visit website"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                  </a>
                )}
                {project.coingecko_id && (
                  <a
                    href={`https://www.coingecko.com/en/coins/${project.coingecko_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-300 hover:text-emerald-600 transition-colors"
                    title="View on CoinGecko"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </a>
                )}
              </div>
              <div className="text-sm text-gray-600 font-medium">{formatAge(project.project_age_years)}</div>
              <div className="text-sm text-gray-600 font-medium">{formatMcap(project.current_market_cap)}</div>
              <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
                {project.website_stage1_tier && (
                  <SignalBasedTooltip
                    projectSymbol={project.symbol}
                    signals={project.website_stage1_analysis?.signals_found}
                    redFlags={project.website_stage1_analysis?.red_flags}
                    websiteAnalysis={project.website_stage1_analysis}
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
                {project.whitepaper_tier ? (
                  <WhitepaperTooltip
                    projectSymbol={project.symbol}
                    whitepaperTier={project.whitepaper_tier}
                    whitepaperUrl={project.whitepaper_url}
                    whitepaperStoryAnalysis={project.whitepaper_story_analysis}
                    whitepaperPhase2Comparison={project.whitepaper_phase2_comparison}
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
                ) : (
                  <div className="relative group">
                    <span className="text-gray-300 text-xs cursor-help">—</span>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                      No whitepaper found
                    </div>
                  </div>
                )}
              </div>
              {/* Error Indicator */}
              <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
                {project.analysis_errors && Object.keys(project.analysis_errors).length > 0 ? (
                  <div className="relative group">
                    <span className="text-red-500 cursor-help">⚠️</span>
                    {/* Tooltip with smart positioning - shows above by default, adjusts if cut off */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-3 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-xl max-h-96 overflow-auto">
                      <div className="font-bold mb-2 text-red-300">Analysis Errors:</div>
                      {Object.entries(project.analysis_errors).map(([errorType, errorData]) => (
                        <div key={errorType} className="mb-2 last:mb-0">
                          <div className="font-semibold text-yellow-300 capitalize">
                            {errorType.replace(/_/g, ' ')}:
                          </div>
                          <div className="text-gray-300 ml-2">{errorData.error}</div>
                          <div className="text-gray-500 text-[10px] ml-2 mt-0.5">
                            Attempt #{errorData.attempt} • {new Date(errorData.failed_at).toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
              <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
                <ProjectActionMenu
                  projectSymbol={project.symbol}
                  projectName={project.name}
                  hasWhitepaper={!!project.whitepaper_tier}
                  onAddWhitepaper={() => {
                    setSelectedProject({ symbol: project.symbol, name: project.name });
                    setShowAddWhitepaperModal(true);
                  }}
                />
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

      {/* Add Whitepaper Modal */}
      {selectedProject && (
        <AddWhitepaperModal
          isOpen={showAddWhitepaperModal}
          projectSymbol={selectedProject.symbol}
          projectName={selectedProject.name}
          onClose={() => {
            setShowAddWhitepaperModal(false);
            setSelectedProject(null);
          }}
          onSuccess={() => {
            fetchProjects(1, true);
          }}
        />
      )}
    </div>
  );
}
