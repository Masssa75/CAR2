'use client';

import { useState, useRef, useEffect } from 'react';
import MarketCapChart from './MarketCapChart';

interface MarketCapTooltipProps {
  coinGeckoId?: string | null;
  currentMarketCap: number;
  children: React.ReactNode;
}

export function MarketCapTooltip({
  coinGeckoId,
  currentMarketCap,
  children
}: MarketCapTooltipProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0, positionBelow: false });
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const triggerRef = useRef<HTMLDivElement>(null);

  // Don't show tooltip if no CoinGecko ID
  if (!coinGeckoId) {
    return <>{children}</>;
  }

  const handleMouseEnter = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const isMobile = viewportWidth < 768;

      // Responsive width: smaller on mobile to prevent cutoff
      const tooltipWidth = isMobile ? Math.min(viewportWidth - 20, 380) : 450;
      const tooltipHeight = 400;
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
    }, 300);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setShowTooltip(false);
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
      <div
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="cursor-help"
      >
        {children}
      </div>

      {showTooltip && (
        <div
          className="fixed z-[999999] pointer-events-none"
          style={{
            left: `${position.x}px`,
            top: position.positionBelow ? `${position.y}px` : 'auto',
            bottom: position.positionBelow ? 'auto' : `${window.innerHeight - position.y}px`,
            transform: 'translateX(-50%)',
            width: window.innerWidth < 768 ? `${Math.min(window.innerWidth - 20, 380)}px` : '450px'
          }}
          onMouseEnter={handleMouseLeave}
        >
          <div className={`bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden ${
            position.positionBelow ? 'mt-2' : 'mb-2'
          }`}>
            <MarketCapChart
              coinGeckoId={coinGeckoId}
              currentMarketCap={currentMarketCap}
            />
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
