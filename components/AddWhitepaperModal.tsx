'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';

interface AddWhitepaperModalProps {
  projectSymbol: string;
  projectName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddWhitepaperModal({
  projectSymbol,
  projectName,
  isOpen,
  onClose,
  onSuccess
}: AddWhitepaperModalProps) {
  const [whitepaperUrl, setWhitepaperUrl] = useState('');
  const [whitepaperContent, setWhitepaperContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!whitepaperUrl && !whitepaperContent) {
      setError('Please provide either a URL or paste the whitepaper content');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/submit-whitepaper', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          symbol: projectSymbol,
          whitepaper_url: whitepaperUrl,
          whitepaper_content: whitepaperContent
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit whitepaper');
      }

      onSuccess();
      onClose();
      setWhitepaperUrl('');
      setWhitepaperContent('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit whitepaper');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setWhitepaperUrl('');
      setWhitepaperContent('');
      setError('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={handleClose}>
      <div
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Add Whitepaper</h2>
            <p className="text-sm text-gray-500 mt-1">{projectSymbol} - {projectName}</p>
          </div>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-gray-500 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* URL Input */}
          <div className="mb-6">
            <label htmlFor="whitepaper-url" className="block text-sm font-medium text-gray-700 mb-2">
              Whitepaper URL
            </label>
            <input
              id="whitepaper-url"
              type="url"
              value={whitepaperUrl}
              onChange={(e) => setWhitepaperUrl(e.target.value)}
              placeholder="https://example.com/whitepaper.pdf"
              disabled={isSubmitting}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:bg-gray-50"
            />
          </div>

          {/* OR Divider */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 border-t border-gray-300"></div>
            <span className="text-sm text-gray-500 font-medium">OR</span>
            <div className="flex-1 border-t border-gray-300"></div>
          </div>

          {/* Content Textarea */}
          <div className="mb-6">
            <label htmlFor="whitepaper-content" className="block text-sm font-medium text-gray-700 mb-2">
              Paste whitepaper content
            </label>
            <textarea
              id="whitepaper-content"
              value={whitepaperContent}
              onChange={(e) => setWhitepaperContent(e.target.value)}
              placeholder="Paste the full whitepaper text here..."
              disabled={isSubmitting}
              rows={10}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:bg-gray-50 font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-2">
              Tip: You can copy text from a PDF or paste markdown/plain text
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Submitting...' : 'Submit & Analyze'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
