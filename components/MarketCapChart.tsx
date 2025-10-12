'use client';

import { useEffect, useRef, useState } from 'react';
import { createChart, IChartApi, ISeriesApi } from 'lightweight-charts';

interface MarketCapChartProps {
  symbol: string;
  contractAddress: string;
  currentMarketCap: number;
}

type TimeRange = '7' | '30' | '90' | '365' | 'max';

export default function MarketCapChart({ symbol, contractAddress, currentMarketCap }: MarketCapChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Area'> | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('max');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Extract CoinGecko ID from contract address
  const getCoinGeckoId = (): string => {
    if (contractAddress.startsWith('native:')) {
      return contractAddress.replace('native:', '');
    }
    // For 0x addresses, fall back to symbol (lowercase)
    return symbol.toLowerCase();
  };

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: '#f6f6ef' },
        textColor: '#333',
      },
      grid: {
        vertLines: { color: '#e0e0e0' },
        horzLines: { color: '#e0e0e0' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 300,
      timeScale: {
        timeVisible: true,
        borderColor: '#ddd',
      },
      rightPriceScale: {
        borderColor: '#ddd',
      },
    });

    const series = chart.addAreaSeries({
      topColor: 'rgba(5, 150, 105, 0.4)',
      bottomColor: 'rgba(5, 150, 105, 0.0)',
      lineColor: '#059669',
      lineWidth: 2,
    });

    chartRef.current = chart;
    seriesRef.current = series;

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  useEffect(() => {
    fetchMarketCapData();
  }, [timeRange, symbol, contractAddress]);

  const fetchMarketCapData = async () => {
    setLoading(true);
    setError(null);

    try {
      const coinGeckoId = getCoinGeckoId();
      const days = timeRange === 'max' ? 'max' : timeRange;

      console.log(`[MarketCapChart] Fetching data for ${symbol} (CG ID: ${coinGeckoId}), days: ${days}`);

      const response = await fetch(
        `/api/coingecko-proxy?coinId=${encodeURIComponent(coinGeckoId)}&days=${days}`
      );

      console.log(`[MarketCapChart] Response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[MarketCapChart] API error:`, errorText);
        throw new Error(`Failed to fetch chart data: ${response.status}`);
      }

      const data = await response.json();

      if (!data.market_caps || data.market_caps.length === 0) {
        console.error(`[MarketCapChart] No market cap data in response`);
        throw new Error('No market cap data available');
      }

      console.log(`[MarketCapChart] Got ${data.market_caps.length} data points`);

      // Transform data for lightweight-charts
      const chartData = data.market_caps.map(([timestamp, value]: [number, number]) => ({
        time: Math.floor(timestamp / 1000), // Convert to seconds
        value: value,
      }));

      if (seriesRef.current) {
        seriesRef.current.setData(chartData);
        chartRef.current?.timeScale().fitContent();
      }

      setLoading(false);
    } catch (err: any) {
      console.error('[MarketCapChart] Error:', err);
      setError(err.message || 'Failed to load chart data');
      setLoading(false);
    }
  };

  const formatMarketCap = (mcap: number): string => {
    if (mcap >= 1_000_000_000) return `$${(mcap / 1_000_000_000).toFixed(1)}B`;
    if (mcap >= 1_000_000) return `$${(mcap / 1_000_000).toFixed(1)}M`;
    return `$${(mcap / 1000).toFixed(0)}K`;
  };

  if (error) {
    // Fallback to CTA button
    const coinGeckoUrl = `https://www.coingecko.com/en/coins/${getCoinGeckoId()}`;

    return (
      <div className="bg-[#f6f6ef] rounded-lg p-4 border border-gray-200">
        <div className="text-center mb-3">
          <div className="text-[11px] text-[#999] uppercase tracking-wide mb-1">
            Current Market Cap
          </div>
          <div className="text-[24px] font-bold text-[#333]">
            {formatMarketCap(currentMarketCap)}
          </div>
        </div>
        <a
          href={coinGeckoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full bg-white border-2 border-[#8dc351] text-[#8dc351] text-center py-3 rounded-lg font-semibold hover:bg-[#8dc351] hover:text-white transition-colors"
        >
          View Interactive Chart on CoinGecko →
        </a>
      </div>
    );
  }

  return (
    <div className="bg-[#f6f6ef] rounded-lg p-4 border border-gray-200">
      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <div className="text-[11px] text-[#999] uppercase tracking-wide">
          Market Cap History
        </div>
        <div className="text-[13px] font-bold text-[#333]">
          {formatMarketCap(currentMarketCap)}
        </div>
      </div>

      {/* Time Range Toggles */}
      <div className="flex gap-1 mb-3">
        {(['7', '30', '90', '365', 'max'] as TimeRange[]).map((range) => (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            className={`flex-1 py-1.5 text-[11px] font-semibold rounded transition-colors ${
              timeRange === range
                ? 'bg-[#059669] text-white'
                : 'bg-white text-[#999] hover:bg-[#e0e0e0]'
            }`}
          >
            {range === 'max' ? 'MAX' : `${range}D`}
          </button>
        ))}
      </div>

      {/* Chart */}
      {loading ? (
        <div className="h-[300px] flex items-center justify-center bg-white rounded">
          <div className="text-[#999] text-sm">Loading chart...</div>
        </div>
      ) : (
        <div ref={chartContainerRef} className="rounded overflow-hidden" />
      )}
    </div>
  );
}
