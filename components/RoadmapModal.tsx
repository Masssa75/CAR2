'use client';

import React from 'react';
import { X } from 'lucide-react';

interface RoadmapModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RoadmapModal({ isOpen, onClose }: RoadmapModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">🚀 Platform Evolution</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-6 space-y-8">

          {/* CAR2: The Evolution */}
          <section>
            <h3 className="text-xl font-bold text-emerald-600 mb-4">🎆 CAR2: The Evolution (October 2-November 2, 2025)</h3>

            <div className="space-y-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">November 2, 2025 (v1.53)</h4>
                <ul className="space-y-1 text-sm text-gray-700 ml-4">
                  <li>🎯 <strong>Admin Separation</strong> - Moved curation tools to dedicated admin panel</li>
                  <li>🎨 <strong>Cleaner Public UI</strong> - Removed admin-only features for better user experience</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">November 2, 2025 (v1.52)</h4>
                <ul className="space-y-1 text-sm text-gray-700 ml-4">
                  <li>📊 <strong>Market Research</strong> - Validated AI altcoin thesis with institutional data</li>
                  <li>💼 <strong>Investor Communications</strong> - Drafted comprehensive investor updates</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">November 2, 2025 (v1.51)</h4>
                <ul className="space-y-1 text-sm text-gray-700 ml-4">
                  <li>⚡ <strong>Performance Boost</strong> - Page load time: 3-5s → &lt;1s (5x faster)</li>
                  <li>🎯 <strong>Enhanced Gem Mode</strong> - Now finds ALPHA projects across website, whitepaper, OR X analysis</li>
                  <li>📱 <strong>Mobile Improvements</strong> - Fixed filter positioning, added sort dropdown</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">November 1, 2025 (v1.50)</h4>
                <ul className="space-y-1 text-sm text-gray-700 ml-4">
                  <li>🎨 <strong>Rebranding</strong> - CoinAiRank → AiCoinSignals with new domain</li>
                  <li>🌐 <strong>SSL Configuration</strong> - Secure HTTPS on aicoinsignals.com</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">November 1, 2025 (v1.49)</h4>
                <ul className="space-y-1 text-sm text-gray-700 ml-4">
                  <li>📊 <strong>Coverage Expansion</strong> - Top 2,500 → 3,000 coins (20% increase)</li>
                  <li>🔧 <strong>Bittensor Filter</strong> - Added subnet filter for 31 Bittensor projects</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">October 30, 2025 (v1.47)</h4>
                <ul className="space-y-1 text-sm text-gray-700 ml-4">
                  <li>🐛 <strong>X Analysis Fix</strong> - Restored automated Twitter analysis (0% → 95%+ success rate)</li>
                  <li>🔧 <strong>API Migration</strong> - Updated to CoinGecko Pro API</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">October 29, 2025 (v1.44)</h4>
                <ul className="space-y-1 text-sm text-gray-700 ml-4">
                  <li>🚀 <strong>CoinGecko Pro</strong> - Upgraded to 500K calls/month (50x increase)</li>
                  <li>📊 <strong>Coverage 2,500</strong> - Expanded from 2,250 → 2,500 coins</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">October 26, 2025 (v1.45)</h4>
                <ul className="space-y-1 text-sm text-gray-700 ml-4">
                  <li>⚡ <strong>Performance Crisis Solved</strong> - Fixed 60s timeouts with database indexing</li>
                  <li>🔧 <strong>X Tier Filtering</strong> - Added sortable X analysis tiers</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">October 26, 2025 (v1.43)</h4>
                <ul className="space-y-1 text-sm text-gray-700 ml-4">
                  <li>📱 <strong>Mobile Responsive</strong> - Full mobile admin interface with touch controls</li>
                  <li>📊 <strong>Market Data Integration</strong> - Added volume & 24h price change columns</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">October 25, 2025 (v1.42)</h4>
                <ul className="space-y-1 text-sm text-gray-700 ml-4">
                  <li>📊 <strong>Real-Time Market Data</strong> - 21 fields updating every 30 min for 3,000 coins</li>
                  <li>⚡ <strong>Automated Updates</strong> - 1,977 coins updated in 31 seconds</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">October 24, 2025 (v1.41)</h4>
                <ul className="space-y-1 text-sm text-gray-700 ml-4">
                  <li>🔧 <strong>CoinGecko IDs</strong> - Increased coverage from 73% → 91% (2,453 projects)</li>
                  <li>🔗 <strong>Platform Links</strong> - Smart priority system (CoinGecko primary)</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">October 23, 2025 (v1.40)</h4>
                <ul className="space-y-1 text-sm text-gray-700 ml-4">
                  <li>🎨 <strong>Screenshot Previews</strong> - Hover tooltips with website previews</li>
                  <li>🖼️ <strong>Auto-Capture</strong> - Smart screenshot system with 5-min cooldown</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">October 23, 2025 (v1.36-39)</h4>
                <ul className="space-y-1 text-sm text-gray-700 ml-4">
                  <li>🐦 <strong>X/Twitter Analysis</strong> - Full integration with admin UI</li>
                  <li>📊 <strong>Signal System</strong> - 13 signal categories, append-only history</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">October 22, 2025 (v1.35)</h4>
                <ul className="space-y-1 text-sm text-gray-700 ml-4">
                  <li>🤖 <strong>X Signal Analyzer</strong> - Deployed dual-version architecture (fast + comprehensive)</li>
                  <li>📊 <strong>Database Schema</strong> - Added 11 columns for X analysis data</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">October 2, 2025 (Phase 2)</h4>
                <ul className="space-y-1 text-sm text-gray-700 ml-4">
                  <li>🚀 <strong>CAR2 Launch</strong> - Clean migration with lessons learned</li>
                  <li>📊 <strong>Schema Optimization</strong> - 147 → 71 columns (52% reduction)</li>
                  <li>🏗️ <strong>Normalized Structure</strong> - Separate whitepaper_content table</li>
                </ul>
              </div>
            </div>
          </section>

          {/* CAR: The Beginning */}
          <section>
            <h3 className="text-xl font-bold text-blue-600 mb-4">🎬 CAR: The Beginning (September 1-October 2, 2025)</h3>

            <div className="space-y-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">September 29, 2025</h4>
                <ul className="space-y-1 text-sm text-gray-700 ml-4">
                  <li>📄 <strong>Story Format</strong> - 8-section narrative analysis (Vision, Innovation, Market, Team, etc.)</li>
                  <li>🎯 <strong>Ranking Interface</strong> - Standalone app for benchmark comparison</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">September 24-26, 2025</h4>
                <ul className="space-y-1 text-sm text-gray-700 ml-4">
                  <li>📄 <strong>Evidence-Based Analysis</strong> - Complete whitepaper overhaul</li>
                  <li>🧪 <strong>Prompt Testing</strong> - 50+ variations to find optimal format</li>
                  <li>📊 <strong>Benchmark Library</strong> - Created tier examples from top projects</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">September 21-23, 2025</h4>
                <ul className="space-y-1 text-sm text-gray-700 ml-4">
                  <li>🐦 <strong>X Analyzer SSE</strong> - Real-time Twitter analysis with Nitter scraping</li>
                  <li>📄 <strong>Whitepaper System</strong> - Multi-stage development</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">September 16, 2025</h4>
                <ul className="space-y-1 text-sm text-gray-700 ml-4">
                  <li>🖥️ <strong>Browserless Integration</strong> - JavaScript-rendered sites support</li>
                  <li>🔄 <strong>Phase 2 Auto-Trigger</strong> - Automatic deep analysis workflow</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">September 15, 2025</h4>
                <ul className="space-y-1 text-sm text-gray-700 ml-4">
                  <li>🌐 <strong>Native Token Support</strong> - L1 chains (Bitcoin, Bittensor, etc.)</li>
                  <li>🔧 <strong>Custom Networks</strong> - Beyond just Ethereum (Cosmos, Solana, etc.)</li>
                  <li>📊 <strong>Multi-Chain Foundation</strong> - "Other" filter for any blockchain</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">September 11-14, 2025</h4>
                <ul className="space-y-1 text-sm text-gray-700 ml-4">
                  <li>🤖 <strong>HTML Parser</strong> - 97% size reduction for AI processing</li>
                  <li>🎨 <strong>Admin Dashboard</strong> - Benchmark management interface</li>
                  <li>🌐 <strong>CoinGecko Integration</strong> - API setup for mass ingestion</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">September 1-10, 2025</h4>
                <ul className="space-y-1 text-sm text-gray-700 ml-4">
                  <li>🎯 <strong>Project Genesis</strong> - Initial concept: AI-powered crypto project rating system</li>
                  <li>🏗️ <strong>Foundation</strong> - Database schema, basic website analysis</li>
                  <li>🔧 <strong>Stage 1 Analyzer</strong> - First AI evaluation system deployed</li>
                  <li>📊 <strong>Benchmark System</strong> - Quality tier definitions (ALPHA/SOLID/BASIC/TRASH)</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Growth Metrics */}
          <section>
            <h3 className="text-xl font-bold text-purple-600 mb-4">📊 Growth Journey</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-emerald-50 rounded-lg p-4">
                <h4 className="font-semibold text-emerald-900 mb-3">Coverage Evolution</h4>
                <ul className="space-y-2 text-sm text-emerald-800">
                  <li>Sept 1: 0 coins (concept phase)</li>
                  <li>Sept 15: 12 projects (manual)</li>
                  <li>Oct 3: 629 projects (cleanup)</li>
                  <li>Oct 6: 990 projects (queue)</li>
                  <li>Oct 12: 1,000 projects (milestone)</li>
                  <li>Oct 29: 2,500 projects (10x)</li>
                  <li className="font-bold">Nov 1: 3,000 projects (30x in 2 months!)</li>
                </ul>
              </div>

              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-3">Performance Evolution</h4>
                <ul className="space-y-2 text-sm text-blue-800">
                  <li>Sept 15: 30s+ page loads</li>
                  <li>Oct 12: 10-15s (with charts)</li>
                  <li>Oct 26: 60s (indexing crisis)</li>
                  <li>Oct 26: 10.8s (crisis fixed)</li>
                  <li className="font-bold">Nov 2: &lt;1 second (100x improvement!)</li>
                </ul>
              </div>

              <div className="bg-orange-50 rounded-lg p-4">
                <h4 className="font-semibold text-orange-900 mb-3">Network Evolution</h4>
                <ul className="space-y-2 text-sm text-orange-800">
                  <li>Sept 1: Ethereum only</li>
                  <li>Sept 15: 5 chains</li>
                  <li className="font-bold">Oct 5: 15+ chains (multi-chain!)</li>
                </ul>
              </div>

              <div className="bg-purple-50 rounded-lg p-4">
                <h4 className="font-semibold text-purple-900 mb-3">Analysis Evolution</h4>
                <ul className="space-y-2 text-sm text-purple-800">
                  <li>Sept 1-10: Website only (1-tier)</li>
                  <li>Sept 21: + Whitepaper (2-tier)</li>
                  <li className="font-bold">Sept 22: + X/Twitter (3-tier comprehensive!)</li>
                  <li>Oct 25: Real-time market data (21 fields)</li>
                </ul>
              </div>
            </div>
          </section>

        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <p className="text-sm text-gray-600 text-center">
            Built with 53 development sessions and 92 CAR project sessions • From concept to 3,000 coins in 2 months
          </p>
        </div>
      </div>
    </div>
  );
}
