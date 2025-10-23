'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { Twitter } from 'lucide-react';

interface XSignal {
  signal: string;
  category: string;
  date: string;
  tweet_ref?: string;
  importance?: string;
  strength_score?: number;
}

interface XSignalTooltipProps {
  signals: XSignal[];
  tier: string;
  score: number;
  summary?: string;
  children: React.ReactNode;
}

export function XSignalTooltip({
  signals = [],
  tier,
  score,
  summary,
  children
}: XSignalTooltipProps) {
  const [isVisible, setIsVisible] = React.useState(false);
  const [position, setPosition] = React.useState({ x: 0, y: 0 });
  const triggerRef = React.useRef<HTMLDivElement>(null);
  const tooltipRef = React.useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        x: rect.left + rect.width / 2,
        y: rect.top
      });
      setIsVisible(true);
    }
  };

  const handleMouseLeave = () => {
    setIsVisible(false);
  };

  // Sort signals by date (newest first)
  const sortedSignals = [...signals].sort((a, b) => {
    // Assuming dates are in format like "Oct 20", "Mar 6", etc.
    return b.date.localeCompare(a.date);
  });

  const tooltip = isVisible && (
    <div
      ref={tooltipRef}
      className="fixed z-[9999] bg-white rounded-lg shadow-2xl border border-gray-200 p-6 max-w-2xl"
      style={{
        left: `${position.x}px`,
        top: `${position.y - 20}px`,
        transform: 'translate(-50%, -100%)',
        maxHeight: '80vh',
        overflowY: 'auto'
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200">
        <Twitter className="w-5 h-5 text-blue-500" />
        <h3 className="font-semibold text-gray-900">
          X/Twitter Analysis - {tier} ({score}/100)
        </h3>
      </div>

      {/* Summary */}
      {summary && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-700">{summary}</p>
        </div>
      )}

      {/* Signals */}
      {sortedSignals.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">
            Signals Found ({sortedSignals.length})
          </h4>
          {sortedSignals.map((signal, index) => (
            <div
              key={index}
              className="pl-3 border-l-2 border-blue-200 py-1"
            >
              <div className="text-sm">
                <span className="font-medium text-gray-700">
                  [{signal.category.replace(/_/g, ' ')}]
                </span>
                {' '}
                <span className="text-gray-900">{signal.signal}</span>
                {' '}
                <span className="text-gray-500">({signal.date})</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {signals.length === 0 && (
        <p className="text-sm text-gray-500">No signals found</p>
      )}
    </div>
  );

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="inline-block"
      >
        {children}
      </div>
      {typeof window !== 'undefined' && createPortal(tooltip, document.body)}
    </>
  );
}
