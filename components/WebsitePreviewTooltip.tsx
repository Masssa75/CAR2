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
  const [position, setPosition] = useState({ x: 0, y: 0, positionBelow: false });
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const triggerRef = useRef<HTMLAnchorElement>(null);

  const handleMouseEnter = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const isMobile = viewportWidth < 768;

      // Responsive width: smaller on mobile to prevent cutoff
      const tooltipWidth = isMobile ? Math.min(viewportWidth - 20, 380) : 400;
      const tooltipHeight = 650; // Estimated height (600px screenshot + header/footer)
      const padding = isMobile ? 10 : 20; // Less padding on mobile

      // Vertical positioning
      const spaceAbove = rect.top;
      const spaceBelow = viewportHeight - rect.bottom;
      const positionBelow = spaceAbove < tooltipHeight && spaceBelow > spaceAbove;

      // Horizontal positioning - prevent cutoff on left/right edges
      let xPos = rect.left + rect.width / 2;
      const halfTooltip = tooltipWidth / 2;

      // Adjust if tooltip would go off left edge
      if (xPos - halfTooltip < padding) {
        xPos = halfTooltip + padding;
      }
      // Adjust if tooltip would go off right edge
      else if (xPos + halfTooltip > viewportWidth - padding) {
        xPos = viewportWidth - halfTooltip - padding;
      }

      setPosition({
        x: xPos,
        y: positionBelow ? rect.bottom : rect.top,
        positionBelow
      });
    }

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
        ref={triggerRef}
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
          className="fixed z-[999999] pointer-events-none"
          style={{
            left: `${position.x}px`,
            top: position.positionBelow ? `${position.y}px` : 'auto',
            bottom: position.positionBelow ? 'auto' : `${window.innerHeight - position.y}px`,
            transform: 'translateX(-50%)',
            width: window.innerWidth < 768 ? `${Math.min(window.innerWidth - 20, 380)}px` : '400px'
          }}
          onMouseEnter={handleMouseLeave}
        >
          <div className={`bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden ${
            position.positionBelow ? 'mt-2' : 'mb-2'
          }`}>
            {/* Header */}
            <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50">
              <div className="text-sm font-medium text-gray-700 truncate">
                {projectName}
              </div>
              <div className="text-xs text-gray-500 truncate">
                {new URL(websiteUrl).hostname}
              </div>
            </div>

            {/* Screenshot */}
            <div className="relative bg-gray-100" style={{ height: '600px' }}>
              {!imageLoaded && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ff6600]"></div>
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
            <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
              <div className="text-xs text-gray-500 text-center">
                Click to visit website
              </div>
            </div>
          </div>

          {/* Tooltip arrow */}
          <div className={`absolute left-1/2 -translate-x-1/2 ${
            position.positionBelow ? 'top-0 -mt-2' : 'bottom-0 -mb-2'
          } w-0 h-0 border-l-8 border-r-8 ${
            position.positionBelow
              ? 'border-b-8 border-l-transparent border-r-transparent border-b-white'
              : 'border-t-8 border-l-transparent border-r-transparent border-t-white'
          }`}></div>
        </div>
      )}
    </div>
  );
}
