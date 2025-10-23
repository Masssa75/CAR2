'use client';

import { useState, useRef, useEffect } from 'react';
import { ExternalLink } from 'lucide-react';

interface WebsitePreviewTooltipProps {
  websiteUrl: string;
  screenshotUrl?: string | null;
  projectName: string;
  onHover?: () => void;
}

export function WebsitePreviewTooltip({
  websiteUrl,
  screenshotUrl,
  projectName,
  onHover
}: WebsitePreviewTooltipProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const handleMouseEnter = () => {
    // Delay tooltip appearance by 300ms
    timeoutRef.current = setTimeout(() => {
      setShowTooltip(true);
      onHover?.();
    }, 300);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setShowTooltip(false);
    setImageLoaded(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="relative inline-block">
      <a
        href={websiteUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="text-gray-400 hover:text-[#ff6600] transition-colors"
      >
        <ExternalLink size={14} />
      </a>

      {showTooltip && screenshotUrl && (
        <div
          className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-50 pointer-events-none"
          style={{ width: '200px' }}
        >
          <div className="bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="px-3 py-2 border-b border-gray-100 bg-gray-50">
              <div className="text-xs font-medium text-gray-700 truncate">
                {projectName}
              </div>
              <div className="text-[10px] text-gray-500 truncate">
                {new URL(websiteUrl).hostname}
              </div>
            </div>

            {/* Screenshot */}
            <div className="relative bg-gray-100" style={{ height: '300px' }}>
              {!imageLoaded && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#ff6600]"></div>
                </div>
              )}
              <img
                src={screenshotUrl}
                alt={`${projectName} website preview`}
                className={`w-full h-full object-cover object-top transition-opacity duration-200 ${
                  imageLoaded ? 'opacity-100' : 'opacity-0'
                }`}
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageLoaded(true)}
              />
            </div>

            {/* Footer hint */}
            <div className="px-3 py-1.5 bg-gray-50 border-t border-gray-100">
              <div className="text-[10px] text-gray-500 text-center">
                Click to visit website
              </div>
            </div>
          </div>

          {/* Tooltip arrow */}
          <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-white"></div>
        </div>
      )}
    </div>
  );
}
