'use client';

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface ResearchModalProps {
  isOpen: boolean;
  projectSymbol: string;
  projectName: string;
  existingResearch?: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function ResearchModal({
  isOpen,
  projectSymbol,
  projectName,
  existingResearch,
  onClose,
  onSuccess
}: ResearchModalProps) {
  const [isEditing, setIsEditing] = useState(!existingResearch);
  const [researchContent, setResearchContent] = useState(existingResearch || '');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setResearchContent(existingResearch || '');
      setIsEditing(!existingResearch);
    }
  }, [isOpen, existingResearch]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!researchContent.trim()) {
      alert('Please enter research content');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/submit-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: projectSymbol,
          researchMd: researchContent
        })
      });

      const json = await response.json();

      if (json.error) {
        alert(`Failed to save research: ${json.error}`);
      } else {
        alert('Research saved successfully!');
        onSuccess();
        onClose();
      }
    } catch (error) {
      console.error('Error saving research:', error);
      alert('Failed to save research');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden pointer-events-auto flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {existingResearch ? 'View/Edit Research' : 'Submit Research'}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {projectSymbol} - {projectName}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {isEditing ? (
              <div>
                <div className="mb-3 flex justify-between items-center">
                  <label className="block text-sm font-medium text-gray-700">
                    Research Content (Markdown)
                  </label>
                  {existingResearch && (
                    <button
                      onClick={() => setIsEditing(false)}
                      className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                    >
                      Preview
                    </button>
                  )}
                </div>
                <textarea
                  value={researchContent}
                  onChange={(e) => setResearchContent(e.target.value)}
                  className="w-full h-96 px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                  placeholder="Paste your deep research markdown here..."
                />
                <p className="text-xs text-gray-500 mt-2">
                  Supports markdown formatting. Paste your full research report.
                </p>
              </div>
            ) : (
              <div>
                <div className="mb-3 flex justify-between items-center">
                  <h3 className="text-sm font-medium text-gray-700">Research Preview</h3>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                  >
                    Edit
                  </button>
                </div>
                <div className="prose prose-sm max-w-none bg-gray-50 rounded-lg p-4 overflow-auto max-h-96">
                  <ReactMarkdown>{researchContent}</ReactMarkdown>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            {isEditing && (
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Saving...' : 'Save Research'}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
