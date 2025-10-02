'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical, FileText } from 'lucide-react';

interface ProjectActionMenuProps {
  projectSymbol: string;
  projectName: string;
  hasWhitepaper: boolean;
  onAddWhitepaper: () => void;
}

export function ProjectActionMenu({
  projectSymbol,
  projectName,
  hasWhitepaper,
  onAddWhitepaper
}: ProjectActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
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
