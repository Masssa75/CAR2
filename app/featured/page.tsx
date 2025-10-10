'use client';

import { useEffect, useState } from 'react';

interface Project {
  symbol: string;
  name: string;
  age: string;
  marketCap: string;
  topSignal: string;
  description: string;
  websiteTier: string;
  whitepaperTier: string;
}

const ageLabels = ['1mo', '6mo', '1y', '2y', '5y'];
const mcapLabels = ['$10M', '$50M', '$100M', '$200M', '$500M', '$1B+'];

export default function FeaturedPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [ageFilter, setAgeFilter] = useState(4); // Default: 5y
  const [mcapFilter, setMcapFilter] = useState(5); // Default: $1B+

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

  return (
    <div className="min-h-screen bg-white">
      <style jsx global>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif;
          background: #fff;
          color: #000;
          line-height: 1.4;
        }
      `}</style>

      <div className="max-w-[420px] mx-auto">
        {/* Header */}
        <div className="px-4 pt-5 pb-4 border-b border-gray-300">
          <div className="text-xl font-bold text-black mb-0.5">
            Coin<span className="text-[#ff6600]">Ai</span>Rank
          </div>
          <div className="text-[13px] text-gray-600">
            Crypto companies rated by AI
          </div>
        </div>

        {/* Filters */}
        <div className="px-4 py-4 bg-[#f6f6ef] border-b border-[#e6e6e6]">
          {/* Age Filter */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2.5">
              <span className="text-[11px] font-semibold text-gray-600 uppercase tracking-wide">
                Max Age
              </span>
              <span className="text-[12px] text-[#ff6600] font-normal">
                {ageLabels[ageFilter]}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="4"
              value={ageFilter}
              onChange={(e) => setAgeFilter(parseInt(e.target.value))}
              className="slider w-full h-1.5 appearance-none bg-gray-300 rounded-sm outline-none"
              style={{
                background: '#ddd',
              }}
            />
            <div className="flex justify-between mt-1.5 px-2.5">
              {ageLabels.map((label, i) => (
                <span key={i} className="text-[10px] text-gray-400">
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* Market Cap Filter */}
          <div>
            <div className="flex justify-between items-center mb-2.5">
              <span className="text-[11px] font-semibold text-gray-600 uppercase tracking-wide">
                Max Market Cap
              </span>
              <span className="text-[12px] text-[#ff6600] font-normal">
                {mcapLabels[mcapFilter]}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="5"
              value={mcapFilter}
              onChange={(e) => setMcapFilter(parseInt(e.target.value))}
              className="slider w-full h-1.5 appearance-none bg-gray-300 rounded-sm outline-none"
            />
            <div className="flex justify-between mt-1.5 px-2.5">
              {mcapLabels.map((label, i) => (
                <span key={i} className="text-[10px] text-gray-400">
                  {label}
                </span>
              ))}
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
                className="px-4 py-4 border-b border-gray-200 active:bg-[#f6f6ef] cursor-pointer"
              >
                {/* Project Name */}
                <div className="mb-2.5">
                  <div className="text-[15px] font-semibold text-black">
                    {project.name}
                  </div>
                </div>

                {/* Top Signal */}
                <div className="text-[13px] text-white bg-[#059669] leading-normal mb-2 px-3 py-2.5 rounded font-semibold">
                  ⚡ {project.topSignal}
                </div>

                {/* Description */}
                <div className="text-[13px] text-gray-800 leading-relaxed mb-2">
                  {project.description}
                </div>

                {/* Meta */}
                <div className="text-[12px] text-gray-400">
                  <span className="mr-3">{project.age}</span>
                  <span>{project.marketCap}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          background: #ff6600;
          cursor: pointer;
          border-radius: 50%;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        .slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          background: #ff6600;
          cursor: pointer;
          border-radius: 50%;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
      `}</style>
    </div>
  );
}
