'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { Zap, Filter, Menu, Plus, Gem, Clock, List, X, FileSearch, ArrowUpDown } from 'lucide-react';
import ProgressRing from '@/components/rank/ProgressRing';
import { SignalBasedTooltip } from '@/components/SignalBasedTooltip';
import { WhitepaperTooltip } from '@/components/WhitepaperTooltip';
import { XSignalTooltip } from '@/components/XSignalTooltip';
import { WebsitePreviewTooltip } from '@/components/WebsitePreviewTooltip';
import { MarketCapTooltip } from '@/components/MarketCapTooltip';
import { PlatformLinks } from '@/components/PlatformLinks';
import { SimpleAddTokenModal } from '@/components/SimpleAddTokenModal';
import { ProjectActionMenu } from '@/components/ProjectActionMenu';
import { AddWhitepaperModal } from '@/components/AddWhitepaperModal';
import { ResearchModal } from '@/components/ResearchModal';
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
  dex_age_years: number | null;
  age_source: string | null;
  current_market_cap: number | null;
  total_volume: number | null;
  price_change_percentage_24h: number | null;
  image_url: string | null;
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
  website_screenshot_url?: string | null;
  twitter_url?: string | null;
  coingecko_id?: string | null;
  coinmarketcap_id?: string | null;
  contract_address?: string | null;
  network?: string | null;
  x_tier?: 'ALPHA' | 'SOLID' | 'BASIC' | 'TRASH' | null;
  x_score?: number | null;
  x_signals_found?: any[];
  x_analysis_summary?: string | null;
  deep_research_md?: string | null;
  research_analyzed_at?: string | null;
  analysis_errors?: {
    [key: string]: AnalysisError;
  };
}

interface FilterState {
  tokenType: 'all' | 'utility' | 'meme' | 'stablecoin';
  websiteTiers: string[];
  whitepaperTiers: string[];
  xTiers: string[];
  maxAge: string;
  maxMcap: string;
  bittensorOnly: boolean;
}

type SortColumn = 'name' | 'project_age_years' | 'current_market_cap' | 'website_stage1_tier' | 'whitepaper_tier' | 'created_at' | 'total_volume' | 'price_change_percentage_24h';
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
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('latest');
  const [hotPicksActive, setHotPicksActive] = useState(false);
  const [showAddTokenModal, setShowAddTokenModal] = useState(false);
  const [showAddWhitepaperModal, setShowAddWhitepaperModal] = useState(false);
  const [showResearchModal, setShowResearchModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<{ symbol: string; name: string; research?: string | null } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [hideDismissed, setHideDismissed] = useState(true);
  const [filters, setFilters] = useState<FilterState>({
    tokenType: 'all',
    websiteTiers: [],
    whitepaperTiers: [],
    xTiers: [],
    maxAge: '',
    maxMcap: '',
    bittensorOnly: false
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

  // Smart screenshot capture: runs AFTER initial load, processes 1 at a time with delay
  useEffect(() => {
    if (!projects || projects.length === 0 || loading) return;

    // Find projects missing screenshots
    const projectsNeedingScreenshots = projects.filter(
      p => !p.website_screenshot_url && p.website_url
    );

    if (projectsNeedingScreenshots.length === 0) return;

    // Capture screenshots one at a time with 2-second delay between each
    let currentIndex = 0;
    const captureNext = async () => {
      if (currentIndex >= projectsNeedingScreenshots.length) return;

      const project = projectsNeedingScreenshots[currentIndex];

      try {
        const response = await fetch('/api/capture-screenshot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: project.website_url,
            tokenId: project.id,
            table: 'crypto_projects_rated'
          })
        });

        if (response.ok) {
          const result = await response.json();
          // Update the project in state with new screenshot URL
          setProjects(prevProjects =>
            prevProjects.map(p =>
              p.id === project.id
                ? { ...p, website_screenshot_url: result.screenshot_url }
                : p
            )
          );
        }
      } catch (error) {
        console.error(`Failed to capture screenshot for ${project.symbol}:`, error);
      }

      currentIndex++;

      // Wait 2 seconds before capturing next screenshot
      if (currentIndex < projectsNeedingScreenshots.length) {
        setTimeout(captureNext, 2000);
      }
    };

    // Start capturing after 2 seconds (after page has loaded)
    const timeoutId = setTimeout(captureNext, 2000);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [projects, loading]);

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
        JSON.stringify(prevFilters.xTiers) !== JSON.stringify(filters.xTiers) ||
        prevFilters.maxAge !== filters.maxAge ||
        prevFilters.maxMcap !== filters.maxMcap)
    ) {
      setViewMode(null);
    }
    filtersRef.current = filters;
  }, [filters]);

  // Refetch when filters, sort, viewMode, or hideDismissed changes
  useEffect(() => {
    fetchProjects(1, true);
  }, [filters, sortColumn, sortDirection, viewMode, hideDismissed]);

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
        limit: '30',  // Reduced from 50 for faster initial load
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

      // Add gem mode (overrides manual filters)
      if (viewMode === 'gem') {
        params.append('gemMode', 'true');
      }

      // Add filters (only when NOT searching AND NOT in gem mode - search and gem mode override filters)
      if (!hasSearch && viewMode !== 'gem') {
        if (filters.tokenType !== 'all') {
          params.append('tokenType', filters.tokenType);
        }

        if (filters.websiteTiers.length > 0) {
          params.append('websiteTiers', filters.websiteTiers.join(','));
        }

        if (filters.whitepaperTiers.length > 0) {
          params.append('whitepaperTiers', filters.whitepaperTiers.join(','));
        }

        if (filters.xTiers.length > 0) {
          params.append('xTiers', filters.xTiers.join(','));
        }

        if (filters.bittensorOnly) {
          params.append('network', 'bittensor');
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

  async function handleAnalyzeTwitter(projectId: number, symbol: string, twitterUrl: string) {
    try {
      // Extract handle from Twitter URL
      const handle = twitterUrl.split('/').pop() || '';

      const response = await fetch('/api/analyze-twitter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, symbol, handle })
      });

      const json = await response.json();

      if (json.error) {
        alert(`Failed to analyze Twitter: ${json.error}`);
      } else {
        alert(json.message || 'Twitter analysis started! Results will be available in ~2 minutes.');
      }
    } catch (error) {
      console.error('Error analyzing Twitter:', error);
      alert('Failed to start Twitter analysis');
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
    // Keep view mode active when sorting (e.g., sort gems by volume/gains)
  }

  function applyViewMode(mode: ViewMode) {
    setViewMode(mode);
    setShowViewModeDropdown(false);

    if (mode === 'gem') {
      // Gem mode: Magic preset - ALPHA in anything (website/whitepaper/X), age ≤5y, sort by youngest
      // NOTE: Filter logic handled in API via gemMode=true parameter, not by setting filter UI
      setSortColumn('project_age_years');
      setSortDirection('asc');
    } else if (mode === 'latest') {
      // Latest mode: clear filters, sort by newest added
      setFilters({
        tokenType: 'all',
        websiteTiers: [],
        whitepaperTiers: [],
        xTiers: [],
        maxAge: '',
        maxMcap: '',
        bittensorOnly: false
      });
      setSortColumn('created_at');
      setSortDirection('desc');
    } else if (mode === 'all') {
      // All mode: clear filters, sort by market cap
      setFilters({
        tokenType: 'all',
        websiteTiers: [],
        whitepaperTiers: [],
        xTiers: [],
        maxAge: '',
        maxMcap: '',
        bittensorOnly: false
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
    if (filters.xTiers.length > 0) count++;
    if (filters.bittensorOnly) count++;
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

  function formatDualAge(primaryAge: number | null, dexAge: number | null, ageSource: string | null) {
    const hasBothAges = primaryAge !== null && dexAge !== null;

    // If no DEX age or ages are identical, show single age
    if (!hasBothAges || primaryAge === dexAge) {
      return <span className="text-sm text-gray-600 font-medium">{formatAge(primaryAge)}</span>;
    }

    // Show both ages with source labels
    const sourceLabel = ageSource === 'genesis' ? 'CG' :
                       ageSource === 'cmc_launch' ? 'CMC' :
                       ageSource === 'cmc_added' ? 'CMC' : '';

    return (
      <div className="flex flex-col items-start gap-0.5">
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-500 font-medium">{sourceLabel}</span>
          <span className="text-sm text-gray-600 font-bold">{formatAge(primaryAge)}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-500 font-medium">DEX</span>
          <span className="text-sm text-gray-600 font-medium">{formatAge(dexAge)}</span>
        </div>
      </div>
    );
  }

  function formatMcap(mcap: number | null): string {
    if (!mcap) return '—';
    if (mcap >= 1000000000) return `$${(mcap / 1000000000).toFixed(1)}B`;
    if (mcap >= 1000000) return `$${(mcap / 1000000).toFixed(0)}M`;
    return `$${(mcap / 1000).toFixed(0)}K`;
  }

  function formatVolume(volume: number | null): string {
    if (!volume) return '—';
    if (volume >= 1000000000) return `$${(volume / 1000000000).toFixed(1)}B`;
    if (volume >= 1000000) return `$${(volume / 1000000).toFixed(0)}M`;
    if (volume >= 1000) return `$${(volume / 1000).toFixed(0)}K`;
    return `$${volume.toFixed(0)}`;
  }

  function formatPriceChange(change: number | null): { text: string; colorClass: string } {
    if (change === null || change === undefined) return { text: '—', colorClass: 'text-gray-500' };
    const sign = change >= 0 ? '+' : '';
    const colorClass = change >= 0 ? 'text-emerald-600' : 'text-red-600';
    return { text: `${sign}${change.toFixed(2)}%`, colorClass };
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

  function isNewToken(created_at: string | undefined): boolean {
    if (!created_at) return false;
    const createdDate = new Date(created_at);
    const now = new Date();
    const hoursDiff = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60);
    return hoursDiff <= 24;
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200">
        <div className="flex justify-between items-center px-5 py-4">
          <div className="text-xl font-extrabold">
            <span className="text-emerald-500">Ai</span>CoinSignals
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

            {/* Sort Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowSortDropdown(!showSortDropdown)}
                className="w-9 h-9 flex items-center justify-center bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                <ArrowUpDown className="w-5 h-5 text-gray-600" />
              </button>

              {/* Sort Dropdown Menu */}
              {showSortDropdown && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowSortDropdown(false)} />
                  <div className="absolute top-12 right-0 z-40 bg-white border border-gray-200 rounded-lg shadow-lg w-44">
                    <button
                      onClick={() => {
                        handleSort('created_at');
                        setShowSortDropdown(false);
                      }}
                      className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors text-sm ${
                        sortColumn === 'created_at' ? 'text-emerald-600 font-semibold' : 'text-gray-900'
                      }`}
                    >
                      Latest Added
                    </button>
                    <button
                      onClick={() => {
                        handleSort('current_market_cap');
                        setShowSortDropdown(false);
                      }}
                      className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors text-sm ${
                        sortColumn === 'current_market_cap' ? 'text-emerald-600 font-semibold' : 'text-gray-900'
                      }`}
                    >
                      Market Cap
                    </button>
                    <button
                      onClick={() => {
                        handleSort('total_volume');
                        setShowSortDropdown(false);
                      }}
                      className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors text-sm ${
                        sortColumn === 'total_volume' ? 'text-emerald-600 font-semibold' : 'text-gray-900'
                      }`}
                    >
                      Volume
                    </button>
                    <button
                      onClick={() => {
                        handleSort('price_change_percentage_24h');
                        setShowSortDropdown(false);
                      }}
                      className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors text-sm ${
                        sortColumn === 'price_change_percentage_24h' ? 'text-emerald-600 font-semibold' : 'text-gray-900'
                      }`}
                    >
                      24h Change
                    </button>
                    <button
                      onClick={() => {
                        handleSort('project_age_years');
                        setShowSortDropdown(false);
                      }}
                      className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors text-sm ${
                        sortColumn === 'project_age_years' ? 'text-emerald-600 font-semibold' : 'text-gray-900'
                      }`}
                    >
                      Age
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
                    xTiers: [],
                    maxAge: '',
                    maxMcap: '',
                    bittensorOnly: false
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

            {/* X Tier */}
            <div className="mb-6">
              <div className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">X Tier</div>
              <div className="flex flex-col gap-2">
                {['ALPHA', 'SOLID', 'BASIC'].map(tier => (
                  <button
                    key={tier}
                    onClick={() => {
                      setFilters(prev => ({
                        ...prev,
                        xTiers: prev.xTiers.includes(tier)
                          ? prev.xTiers.filter(t => t !== tier)
                          : [...prev.xTiers, tier]
                      }));
                    }}
                    className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors ${
                      filters.xTiers.includes(tier)
                        ? 'bg-emerald-50 text-emerald-500 border-2 border-emerald-500'
                        : 'bg-white text-gray-600 border-2 border-transparent hover:bg-gray-100'
                    }`}
                  >
                    {tier}
                  </button>
                ))}
              </div>
            </div>

            {/* Bittensor Subnets Filter */}
            <div className="mb-6">
              <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 px-3.5 py-2 rounded-lg transition-colors">
                <input
                  type="checkbox"
                  checked={filters.bittensorOnly}
                  onChange={(e) => setFilters(prev => ({ ...prev, bittensorOnly: e.target.checked }))}
                  className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                />
                <span className="text-sm font-semibold text-gray-700">Bittensor Subnets Only</span>
              </label>
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

        {/* Mobile Filter Modal Overlay */}
        {showFilters && (
          <>
            <div className="fixed inset-0 z-40 bg-black bg-opacity-50 md:hidden" onClick={() => setShowFilters(false)} />
            <div className="fixed inset-x-0 top-0 bottom-0 z-50 md:hidden bg-white overflow-y-auto">
              <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-5 py-4 flex justify-between items-center">
                <h3 className="text-base font-bold text-gray-900">Filters</h3>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setFilters({
                        tokenType: 'all',
                        websiteTiers: [],
                        whitepaperTiers: [],
                        xTiers: [],
                        maxAge: '',
                        maxMcap: '',
                        bittensorOnly: false
                      });
                    }}
                    className="text-sm text-emerald-500 font-semibold"
                  >
                    Reset
                  </button>
                  <button
                    onClick={() => setShowFilters(false)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
              </div>

              <div className="px-5 py-5">

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

              {/* X Tier */}
              <div className="mb-4">
                <div className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">X Tier</div>
                <div className="flex gap-2 flex-wrap">
                  {['ALPHA', 'SOLID', 'BASIC'].map(tier => (
                    <button
                      key={tier}
                      onClick={() => {
                        setFilters(prev => ({
                          ...prev,
                          xTiers: prev.xTiers.includes(tier)
                            ? prev.xTiers.filter(t => t !== tier)
                            : [...prev.xTiers, tier]
                        }));
                      }}
                      className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors ${
                        filters.xTiers.includes(tier)
                          ? 'bg-emerald-50 text-emerald-500 border-2 border-emerald-500'
                          : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
                      }`}
                    >
                      {tier}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bittensor Subnets Filter */}
              <div className="mb-4">
                <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 px-3.5 py-2 rounded-lg transition-colors">
                  <input
                    type="checkbox"
                    checked={filters.bittensorOnly}
                    onChange={(e) => setFilters(prev => ({ ...prev, bittensorOnly: e.target.checked }))}
                    className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                  />
                  <span className="text-sm font-semibold text-gray-700">Bittensor Subnets Only</span>
                </label>
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
            </div>
          </>
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto">
            {/* List Header - Desktop Only */}
            <div className="sticky top-0 z-10 hidden md:grid grid-cols-[2fr_0.3fr_0.8fr_1fr_0.8fr_0.7fr_0.7fr_0.7fr_0.5fr_0.4fr_0.3fr] gap-2 px-5 py-3.5 bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-400 uppercase tracking-wider">
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
              <div onClick={() => handleSort('total_volume')} className="cursor-pointer flex items-center gap-1 justify-center">
                Vol {sortColumn === 'total_volume' && <span className="text-emerald-500">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
              </div>
              <div onClick={() => handleSort('price_change_percentage_24h')} className="cursor-pointer flex items-center gap-1 justify-center">
                24h {sortColumn === 'price_change_percentage_24h' && <span className="text-emerald-500">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
              </div>
              <div className="text-center">Web</div>
              <div className="text-center">WP</div>
              <div className="text-center">X</div>
              <div className="text-center">Err</div>
              <div className="text-center">Research</div>
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
            <React.Fragment key={project.symbol}>
              {/* Desktop Table Row */}
              <div className="hidden md:grid grid-cols-[2fr_0.3fr_0.8fr_1fr_0.8fr_0.7fr_0.7fr_0.7fr_0.5fr_0.4fr_0.3fr] gap-2 px-5 py-5 border-b border-gray-100 items-center hover:bg-gray-50 transition-colors"
            >
              <div>
                <div className="flex items-center gap-2">
                  {project.image_url && (
                    <img
                      src={project.image_url}
                      alt={project.symbol}
                      className="w-6 h-6 rounded-full"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  )}
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
                  {isNewToken(project.created_at) && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-600">
                      NEW
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-400">{project.name}</div>
              </div>
              <div className="flex items-start gap-1 justify-center pt-1" onClick={(e) => e.stopPropagation()}>
                {project.website_url && (
                  <div className="text-gray-300 hover:text-emerald-600 transition-colors">
                    <WebsitePreviewTooltip
                      websiteUrl={project.website_url}
                      screenshotUrl={project.website_screenshot_url}
                      projectName={project.name}
                    />
                  </div>
                )}
                <PlatformLinks
                  coinGeckoId={project.coingecko_id}
                  contractAddress={project.contract_address}
                  network={project.network}
                />
              </div>
              <div>{formatDualAge(project.project_age_years, project.dex_age_years, project.age_source)}</div>
              <div>
                {project.coingecko_id ? (
                  <MarketCapTooltip
                    coinGeckoId={project.coingecko_id}
                    currentMarketCap={project.current_market_cap || 0}
                  >
                    <div className="text-sm text-gray-600 font-medium cursor-help">
                      {formatMcap(project.current_market_cap)}
                    </div>
                  </MarketCapTooltip>
                ) : (
                  <div className="text-sm text-gray-600 font-medium">
                    {formatMcap(project.current_market_cap)}
                  </div>
                )}
              </div>
              <div className="text-sm text-gray-600 font-medium text-center">
                {formatVolume(project.total_volume)}
              </div>
              <div className="text-sm font-medium text-center">
                <span className={formatPriceChange(project.price_change_percentage_24h).colorClass}>
                  {formatPriceChange(project.price_change_percentage_24h).text}
                </span>
              </div>
              <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
                {project.website_stage1_tier ? (
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
                ) : project.analysis_errors && (
                  project.analysis_errors.website_fetch ||
                  project.analysis_errors.website_http_error ||
                  project.analysis_errors.website_analysis
                ) ? (
                  <div className="relative group">
                    <span className="text-amber-500 cursor-help text-lg">⚠️</span>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-3 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-xl">
                      <div className="font-bold mb-2 text-amber-300">Website Analysis Failed</div>
                      {project.analysis_errors.website_fetch && (
                        <div className="mb-2">
                          <div className="text-gray-300">{project.analysis_errors.website_fetch.error}</div>
                          <div className="text-gray-500 text-[10px] mt-0.5">
                            {new Date(project.analysis_errors.website_fetch.failed_at).toLocaleString()}
                          </div>
                        </div>
                      )}
                      {project.analysis_errors.website_http_error && (
                        <div className="mb-2">
                          <div className="text-gray-300">{project.analysis_errors.website_http_error.error}</div>
                          <div className="text-gray-500 text-[10px] mt-0.5">
                            {new Date(project.analysis_errors.website_http_error.failed_at).toLocaleString()}
                          </div>
                        </div>
                      )}
                      {project.analysis_errors.website_analysis && (
                        <div className="mb-2">
                          <div className="text-gray-300">{project.analysis_errors.website_analysis.error}</div>
                          <div className="text-gray-500 text-[10px] mt-0.5">
                            {new Date(project.analysis_errors.website_analysis.failed_at).toLocaleString()}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}
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
                ) : project.analysis_errors && (
                  project.analysis_errors.whitepaper_fetch ||
                  project.analysis_errors.whitepaper_analysis
                ) ? (
                  <div className="relative group">
                    <span className="text-amber-500 cursor-help text-lg">⚠️</span>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-3 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-xl">
                      <div className="font-bold mb-2 text-amber-300">Whitepaper Analysis Failed</div>
                      {project.analysis_errors.whitepaper_fetch && (
                        <div className="mb-2">
                          <div className="text-gray-300">{project.analysis_errors.whitepaper_fetch.error}</div>
                          <div className="text-gray-500 text-[10px] mt-0.5">
                            {new Date(project.analysis_errors.whitepaper_fetch.failed_at).toLocaleString()}
                          </div>
                        </div>
                      )}
                      {project.analysis_errors.whitepaper_analysis && (
                        <div className="mb-2">
                          <div className="text-gray-300">{project.analysis_errors.whitepaper_analysis.error}</div>
                          <div className="text-gray-500 text-[10px] mt-0.5">
                            {new Date(project.analysis_errors.whitepaper_analysis.failed_at).toLocaleString()}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="relative group">
                    <span className="text-gray-300 text-xs cursor-help">—</span>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                      No whitepaper found
                    </div>
                  </div>
                )}
              </div>

              {/* X Tier */}
              <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
                {project.x_tier && project.x_signals_found && project.x_signals_found.length > 0 ? (
                  <XSignalTooltip
                    signals={project.x_signals_found}
                    tier={project.x_tier}
                    score={project.x_score || 0}
                    summary={project.x_analysis_summary || undefined}
                  >
                    <span className={`px-2.5 py-1 rounded-md text-xs font-bold cursor-pointer ${
                      project.x_tier === 'ALPHA' ? 'bg-emerald-50 text-emerald-600' :
                      project.x_tier === 'SOLID' ? 'bg-amber-50 text-amber-600' :
                      project.x_tier === 'BASIC' ? 'bg-orange-50 text-orange-600' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {project.x_tier}
                    </span>
                  </XSignalTooltip>
                ) : null}
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

              {/* Research Badge */}
              <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
                {project.deep_research_md ? (
                  <button
                    onClick={() => {
                      setSelectedProject({
                        symbol: project.symbol,
                        name: project.name,
                        research: project.deep_research_md
                      });
                      setShowResearchModal(true);
                    }}
                    className="px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors flex items-center gap-1 cursor-pointer"
                    title="Click to view research"
                  >
                    <FileSearch className="w-3 h-3" />
                    View
                  </button>
                ) : null}
              </div>
            </div>

            {/* Mobile Card */}
            <div className="block md:hidden p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors overflow-hidden">
              {/* Project Info */}
              <div className="mb-3 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap min-w-0">
                  {project.image_url && (
                    <img
                      src={project.image_url}
                      alt={project.symbol}
                      className="w-7 h-7 rounded-full flex-shrink-0"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  )}
                  <div
                    className="text-lg font-bold cursor-pointer hover:text-emerald-600 transition-colors"
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
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-help ${badge.color}`}>
                          {badge.label}
                        </span>
                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1.5 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-lg">
                          Ingested: {createdDate}
                        </div>
                      </div>
                    );
                  })()}
                  {isNewToken(project.created_at) && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-600">
                      NEW
                    </span>
                  )}
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    {project.website_url && (
                      <div className="text-gray-300 hover:text-emerald-600 transition-colors">
                        <WebsitePreviewTooltip
                          websiteUrl={project.website_url}
                          screenshotUrl={project.website_screenshot_url}
                          projectName={project.name}
                        />
                      </div>
                    )}
                    <PlatformLinks
                      coinGeckoId={project.coingecko_id}
                      contractAddress={project.contract_address}
                      network={project.network}
                    />
                  </div>
                </div>
                <div className="text-sm text-gray-500">{project.name}</div>
              </div>

              {/* Meta Info */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-gray-600 mb-3">
                <div className="flex items-center gap-1">
                  <span className="text-gray-400">Age:</span> {formatDualAge(project.project_age_years, project.dex_age_years, project.age_source)}
                </div>
                <div>
                  <span className="text-gray-400">MCap:</span> {formatMcap(project.current_market_cap)}
                </div>
                <div>
                  <span className="text-gray-400">Vol:</span> {formatVolume(project.total_volume)}
                </div>
                <div>
                  <span className="text-gray-400">24h:</span>{' '}
                  <span className={formatPriceChange(project.price_change_percentage_24h).colorClass}>
                    {formatPriceChange(project.price_change_percentage_24h).text}
                  </span>
                </div>
              </div>

              {/* Tiers - Always show all 3 */}
              <div className="flex flex-wrap gap-2 items-center">
                {/* Website Tier */}
                <div onClick={(e) => e.stopPropagation()}>
                  {project.website_stage1_tier ? (
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
                        Web: {project.website_stage1_tier}
                      </span>
                    </SignalBasedTooltip>
                  ) : (
                    <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-gray-50 text-gray-300 opacity-50">
                      Web: N/A
                    </span>
                  )}
                </div>

                {/* Whitepaper Tier */}
                <div onClick={(e) => e.stopPropagation()}>
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
                        Paper: {project.whitepaper_tier}
                      </span>
                    </WhitepaperTooltip>
                  ) : (
                    <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-gray-50 text-gray-300 opacity-50">
                      Paper: N/A
                    </span>
                  )}
                </div>

                {/* X/Twitter Tier */}
                <div onClick={(e) => e.stopPropagation()}>
                  {project.x_tier && project.x_signals_found && project.x_signals_found.length > 0 ? (
                    <XSignalTooltip
                      signals={project.x_signals_found}
                      tier={project.x_tier}
                      score={project.x_score || 0}
                      summary={project.x_analysis_summary || undefined}
                    >
                      <span className={`px-2.5 py-1 rounded-md text-xs font-bold cursor-pointer ${
                        project.x_tier === 'ALPHA' ? 'bg-emerald-50 text-emerald-600' :
                        project.x_tier === 'SOLID' ? 'bg-amber-50 text-amber-600' :
                        project.x_tier === 'BASIC' ? 'bg-orange-50 text-orange-600' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        X: {project.x_tier}
                      </span>
                    </XSignalTooltip>
                  ) : (
                    <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-gray-50 text-gray-300 opacity-50">
                      X: N/A
                    </span>
                  )}
                </div>

                {/* Research Badge - Mobile */}
                {project.deep_research_md && (
                  <div onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => {
                        setSelectedProject({
                          symbol: project.symbol,
                          name: project.name,
                          research: project.deep_research_md
                        });
                        setShowResearchModal(true);
                      }}
                      className="px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors flex items-center gap-1"
                    >
                      <FileSearch className="w-3 h-3" />
                      Research
                    </button>
                  </div>
                )}

                {/* Error Indicator */}
                {project.analysis_errors && Object.keys(project.analysis_errors).length > 0 ? (
                  <div onClick={(e) => e.stopPropagation()}>
                    <div className="relative group">
                      <span className="text-red-500 cursor-help text-lg">⚠️</span>
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
                  </div>
                ) : null}
              </div>
            </div>
          </React.Fragment>
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

      {/* Research Modal */}
      {selectedProject && (
        <ResearchModal
          isOpen={showResearchModal}
          projectSymbol={selectedProject.symbol}
          projectName={selectedProject.name}
          existingResearch={selectedProject.research}
          onClose={() => {
            setShowResearchModal(false);
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
