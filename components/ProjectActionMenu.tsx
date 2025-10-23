'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical, FileText, Twitter } from 'lucide-react';

interface ProjectActionMenuProps {
  projectSymbol: string;
  projectName: string;
  hasWhitepaper: boolean;
  twitterUrl?: string | null;
  onAddWhitepaper: () => void;
  onAnalyzeTwitter?: () => void;
}

export function ProjectActionMenu({
  projectSymbol,
  projectName,
  hasWhitepaper,
  twitterUrl,
  onAddWhitepaper,
  onAnalyzeTwitter
}: ProjectActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleAddWhitepaper = () => {
    setIsOpen(false);
    onAddWhitepaper();
  };

  const handleAnalyzeTwitter = async () => {
    if (!onAnalyzeTwitter) return;

    setIsAnalyzing(true);
    setIsOpen(false);

    try {
      await onAnalyzeTwitter();
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
        aria-label="Project actions"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
          {!hasWhitepaper && (
            <button
              onClick={handleAddWhitepaper}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
            >
              <FileText className="w-4 h-4" />
              Add whitepaper
            </button>
          )}

          {twitterUrl && onAnalyzeTwitter && (
            <button
              onClick={handleAnalyzeTwitter}
              disabled={isAnalyzing}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Twitter className="w-4 h-4" />
              {isAnalyzing ? 'Analyzing Twitter...' : 'Analyze Twitter'}
            </button>
          )}

          {/* Future menu items can be added here */}
          {/*
          <button className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Re-analyze website
          </button>
          */}
        </div>
      )}
    </div>
  );
}
