'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ExternalLink, Twitter, Send, ChevronDown } from 'lucide-react';

interface Project {
  symbol: string;
  name: string;
  age: string;
  marketCap: string;
  topSignal: string;
  description: string;
  websiteTier: string;
  whitepaperTier: string;
  websiteUrl: string;
  twitterUrl: string;
}

const ageLabels = ['1mo', '6mo', '1y', '2y', '5y'];
const mcapLabels = ['$10M', '$50M', '$100M', '$200M', '$500M', '$1B+'];

export default function FeaturedPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [ageFilter, setAgeFilter] = useState(4); // Default: 5y
  const [mcapFilter, setMcapFilter] = useState(5); // Default: $1B+
  const [filtersExpanded, setFiltersExpanded] = useState(true);
  const router = useRouter();

  // Restore filter state from localStorage
  useEffect(() => {
    const savedState = localStorage.getItem('filtersExpanded');
    if (savedState !== null) {
      setFiltersExpanded(savedState === 'true');
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [ageFilter, mcapFilter]);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/featured-projects?maxAge=${ageFilter}&maxMcap=${mcapFilter}`
      );
      const data = await response.json();
      setProjects(data.projects || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFilters = () => {
    const newState = !filtersExpanded;
    setFiltersExpanded(newState);
    localStorage.setItem('filtersExpanded', String(newState));
  };

  return (
    <div className="min-h-screen bg-white font-sans">
      <div className="max-w-[420px] mx-auto">
        {/* Header */}
        <div className="px-4 pt-5 pb-4 border-b border-[#ddd] flex justify-between items-start">
          <div>
            <div className="text-xl font-bold text-black mb-0.5">
              Coin<span className="text-[#ff6600]">Ai</span>Rank
            </div>
            <div className="text-[13px] text-gray-600">
              Quality crypto companies discovered by AI
            </div>
          </div>
          <a
            href="https://t.me/+BfehJPPT2zU1NzE1"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#0088cc] mt-0.5"
          >
            <Send size={20} />
          </a>
        </div>

        {/* Filters */}
        <div className="bg-white border-b border-[#eee]">
          <div
            className="px-4 py-3 flex justify-between items-center cursor-pointer select-none hover:bg-[#fafafa]"
            onClick={toggleFilters}
          >
            <span className="text-[11px] font-semibold text-gray-600 uppercase tracking-wide">
              Filters
            </span>
            <ChevronDown
              size={16}
              className={`text-gray-400 transition-transform duration-200 ${
                filtersExpanded ? 'rotate-180' : ''
              }`}
            />
          </div>

          <div
            className={`overflow-hidden transition-all duration-300 ${
              filtersExpanded ? 'max-h-[200px] px-4 pb-3' : 'max-h-0 px-4 pb-0'
            }`}
          >
            {/* Age Filter */}
            <div className="mb-2">
              <div className="flex justify-between items-center mb-1">
                <span style={{ display: 'inline' }} className="text-[9px] font-medium text-gray-400 uppercase tracking-wide">
                  Max Age
                </span>
                <span style={{ display: 'inline' }} className="text-[9px] text-[#ff6600] font-semibold">
                  {ageLabels[ageFilter]}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="4"
                value={ageFilter}
                onChange={(e) => setAgeFilter(parseInt(e.target.value))}
                className="slider w-full"
              />
            </div>

            {/* Market Cap Filter */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span style={{ display: 'inline' }} className="text-[9px] font-medium text-gray-400 uppercase tracking-wide">
                  Max Market Cap
                </span>
                <span style={{ display: 'inline' }} className="text-[9px] text-[#ff6600] font-semibold">
                  {mcapLabels[mcapFilter]}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="5"
                value={mcapFilter}
                onChange={(e) => setMcapFilter(parseInt(e.target.value))}
                className="slider w-full"
              />
            </div>
          </div>
        </div>

        {/* Project List */}
        {loading ? (
          <div className="px-4 py-8 text-center text-gray-500">
            Loading projects...
          </div>
        ) : projects.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-500">
            No featured projects found with current filters.
          </div>
        ) : (
          <div>
            {projects.map((project) => (
              <div
                key={project.symbol}
                onClick={() => router.push(`/featured/${project.symbol}`)}
                className="px-4 py-4 border-b border-[#eee] hover:bg-[#fafafa] active:bg-[#f6f6ef] cursor-pointer"
              >
                {/* Name row with icons */}
                <div className="flex items-center gap-2 mb-2.5">
                  <div className="text-[15px] font-semibold text-black">
                    {project.name}
                  </div>
                  <div className="flex gap-1.5">
                    {project.websiteUrl && (
                      <a
                        href={project.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-gray-400 hover:text-[#ff6600] transition-colors"
                      >
                        <ExternalLink size={14} />
                      </a>
                    )}
                    {project.twitterUrl && (
                      <a
                        href={project.twitterUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-gray-400 hover:text-[#ff6600] transition-colors"
                      >
                        <Twitter size={14} />
                      </a>
                    )}
                  </div>
                </div>

                {/* Top Signal */}
                <div className="text-[13px] text-white bg-[#059669] leading-[1.5] mb-2 px-3 py-2.5 rounded font-semibold break-words">
                  ⚡ {project.topSignal}
                </div>

                {/* Description */}
                <div className="text-[13px] text-[#333] leading-relaxed mb-2">
                  {project.description}
                </div>

                {/* Meta */}
                <div className="text-[12px] text-[#999]">
                  <span className="mr-3">{project.age}</span>
                  <span>{project.marketCap}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .slider {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 3px;
          background: #e5e5e5;
          border-radius: 2px;
          outline: none;
        }
        .slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 14px;
          height: 14px;
          background: #ff6600;
          cursor: pointer;
          border-radius: 50%;
          border: none;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
        }
        .slider::-moz-range-thumb {
          width: 14px;
          height: 14px;
          background: #ff6600;
          cursor: pointer;
          border-radius: 50%;
          border: none;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
        }
      `}} />
    </div>
  );
}
