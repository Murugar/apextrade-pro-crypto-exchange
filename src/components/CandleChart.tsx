import React, { useState, useMemo, useRef } from 'react';
import { Candle } from '../types/crypto';

interface CandleChartProps {
  candles: Candle[];
  symbol: string;
  currentPrice: number;
  prevPrice: number;
}

export const CandleChart: React.FC<CandleChartProps> = ({
  candles,
  symbol,
  currentPrice,
}) => {
  const [timeframe, setTimeframe] = useState<'1m' | '5m' | '15m' | '1h' | '1D'>('1m');
  const [hoveredCandle, setHoveredCandle] = useState<Candle | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
  const [showIndicators, setShowIndicators] = useState({ ema20: true, ema50: true, volume: true });
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate EMA 20 & EMA 50
  const { ema20, ema50 } = useMemo(() => {
    const calcEma = (period: number) => {
      if (candles.length === 0) return [];
      const k = 2 / (period + 1);
      const emaArr: (number | null)[] = [];
      let ema = candles[0].close;
      for (let i = 0; i < candles.length; i++) {
        if (i < period - 1) {
          emaArr.push(null);
        } else if (i === period - 1) {
          let sum = 0;
          for (let j = 0; j < period; j++) sum += candles[j].close;
          ema = sum / period;
          emaArr.push(ema);
        } else {
          ema = candles[i].close * k + ema * (1 - k);
          emaArr.push(ema);
        }
      }
      return emaArr;
    };

    return {
      ema20: calcEma(20),
      ema50: calcEma(50),
    };
  }, [candles]);

  // Dimensions
  const height = 380;
  const priceHeight = 290;
  const volumeHeight = 70;
  const paddingRight = 75; // for price axis
  const paddingLeft = 10;
  const paddingTop = 20;

  // Min and max price calculation
  const { minPrice, maxPrice, maxVol } = useMemo(() => {
    if (candles.length === 0) return { minPrice: 0, maxPrice: 100, maxVol: 100 };
    let min = Infinity;
    let max = -Infinity;
    let maxV = 0;

    candles.forEach(c => {
      if (c.low < min) min = c.low;
      if (c.high > max) max = c.high;
      if (c.volume > maxV) maxV = c.volume;
    });

    const margin = (max - min) * 0.08 || 1;
    return {
      minPrice: Math.max(0, min - margin),
      maxPrice: max + margin,
      maxVol: maxV * 1.2 || 10,
    };
  }, [candles]);

  // Scalers
  const getY = (val: number) => {
    return paddingTop + priceHeight - ((val - minPrice) / (maxPrice - minPrice)) * priceHeight;
  };

  const getVolY = (vol: number) => {
    return height - (vol / maxVol) * volumeHeight;
  };

  // Price steps for right axis
  const priceLevels = useMemo(() => {
    const steps = 6;
    const diff = (maxPrice - minPrice) / steps;
    const levels: number[] = [];
    for (let i = 0; i <= steps; i++) {
      levels.push(minPrice + i * diff);
    }
    return levels;
  }, [minPrice, maxPrice]);

  const activeCandle = hoveredCandle || (candles.length > 0 ? candles[candles.length - 1] : null);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const chartWidth = rect.width - paddingRight - paddingLeft;
    const candleWidth = chartWidth / candles.length;
    const index = Math.floor((x - paddingLeft) / candleWidth);

    if (index >= 0 && index < candles.length) {
      setHoveredCandle(candles[index]);
      setHoverPos({ x, y });
    }
  };

  const handleMouseLeave = () => {
    setHoveredCandle(null);
    setHoverPos(null);
  };

  return (
    <div className="bg-[#0e121b] border border-[#1c2230] rounded flex flex-col h-full overflow-hidden select-none" ref={containerRef}>
      {/* Chart Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between border-b border-[#1c2230] px-3 py-1.5 bg-[#0b0e14] text-xs">
        <div className="flex items-center gap-3">
          <span className="font-bold text-slate-100">{symbol}</span>
          
          {/* Timeframes */}
          <div className="flex items-center gap-1 bg-[#151a24] p-0.5 rounded border border-[#202738]">
            {(['1m', '5m', '15m', '1h', '1D'] as const).map(tf => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  timeframe === tf
                    ? 'bg-[#222b3d] text-cyan-400 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Indicator toggles */}
          <div className="hidden sm:flex items-center gap-2 text-[11px]">
            <button
              onClick={() => setShowIndicators(p => ({ ...p, ema20: !p.ema20 }))}
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${showIndicators.ema20 ? 'text-cyan-400' : 'text-slate-500'}`}
            >
              <span className="w-2 h-0.5 bg-cyan-400 inline-block" />
              <span>EMA 20</span>
            </button>
            <button
              onClick={() => setShowIndicators(p => ({ ...p, ema50: !p.ema50 }))}
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${showIndicators.ema50 ? 'text-purple-400' : 'text-slate-500'}`}
            >
              <span className="w-2 h-0.5 bg-purple-400 inline-block" />
              <span>EMA 50</span>
            </button>
          </div>
        </div>

        {/* OHLCV Live HUD */}
        {activeCandle && (
          <div className="flex items-center gap-3 text-[11px] font-mono text-slate-300">
            <span>O: <span className="text-slate-100">{activeCandle.open.toFixed(2)}</span></span>
            <span>H: <span className="text-emerald-400">{activeCandle.high.toFixed(2)}</span></span>
            <span>L: <span className="text-rose-400">{activeCandle.low.toFixed(2)}</span></span>
            <span>C: <span className={activeCandle.close >= activeCandle.open ? 'text-emerald-400' : 'text-rose-400'}>{activeCandle.close.toFixed(2)}</span></span>
            <span className="hidden md:inline">Vol: <span className="text-cyan-300">{activeCandle.volume.toFixed(2)}</span></span>
          </div>
        )}
      </div>

      {/* SVG Canvas */}
      <div className="relative flex-1 w-full bg-[#0b0e14]">
        <svg
          className="w-full h-full cursor-crosshair"
          viewBox={`0 0 800 ${height}`}
          preserveAspectRatio="none"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {/* Horizontal Gridlines */}
          {priceLevels.map((price, idx) => {
            const y = getY(price);
            return (
              <g key={idx}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={800 - paddingRight}
                  y2={y}
                  stroke="#161d2a"
                  strokeDasharray="2 3"
                  strokeWidth="1"
                />
                {/* Right Axis Price Label */}
                <text
                  x={800 - paddingRight + 6}
                  y={y + 3}
                  fill="#64748b"
                  fontSize="10"
                  fontFamily="monospace"
                >
                  {price.toFixed(2)}
                </text>
              </g>
            );
          })}

          {/* Volume Separator */}
          <line
            x1={paddingLeft}
            y1={height - volumeHeight}
            x2={800 - paddingRight}
            y2={height - volumeHeight}
            stroke="#1c2434"
            strokeWidth="1"
          />

          {/* Candlesticks & Volume Bars */}
          {candles.map((candle, idx) => {
            const chartWidth = 800 - paddingRight - paddingLeft;
            const candleWidth = chartWidth / candles.length;
            const x = paddingLeft + idx * candleWidth + candleWidth / 2;
            const isGreen = candle.close >= candle.open;
            const color = isGreen ? '#0ecb81' : '#f6465d';
            
            const openY = getY(candle.open);
            const closeY = getY(candle.close);
            const highY = getY(candle.high);
            const lowY = getY(candle.low);
            const volY = getVolY(candle.volume);

            const bodyY = Math.min(openY, closeY);
            const bodyHeight = Math.max(1, Math.abs(closeY - openY));

            return (
              <g key={idx}>
                {/* Volume bar */}
                {showIndicators.volume && (
                  <rect
                    x={x - candleWidth * 0.4}
                    y={volY}
                    width={candleWidth * 0.8}
                    height={height - volY}
                    fill={color}
                    opacity="0.3"
                  />
                )}

                {/* Wick */}
                <line
                  x1={x}
                  y1={highY}
                  x2={x}
                  y2={lowY}
                  stroke={color}
                  strokeWidth="1.2"
                />

                {/* Candle Body */}
                <rect
                  x={x - candleWidth * 0.38}
                  y={bodyY}
                  width={candleWidth * 0.76}
                  height={bodyHeight}
                  fill={color}
                />
              </g>
            );
          })}

          {/* EMA 20 line */}
          {showIndicators.ema20 && (
            <polyline
              fill="none"
              stroke="#06b6d4"
              strokeWidth="1.5"
              strokeOpacity="0.85"
              points={candles
                .map((_, idx) => {
                  const val = ema20[idx];
                  if (val === null) return null;
                  const chartWidth = 800 - paddingRight - paddingLeft;
                  const candleWidth = chartWidth / candles.length;
                  const x = paddingLeft + idx * candleWidth + candleWidth / 2;
                  const y = getY(val);
                  return `${x},${y}`;
                })
                .filter(Boolean)
                .join(' ')}
            />
          )}

          {/* EMA 50 line */}
          {showIndicators.ema50 && (
            <polyline
              fill="none"
              stroke="#a855f7"
              strokeWidth="1.5"
              strokeOpacity="0.85"
              points={candles
                .map((_, idx) => {
                  const val = ema50[idx];
                  if (val === null) return null;
                  const chartWidth = 800 - paddingRight - paddingLeft;
                  const candleWidth = chartWidth / candles.length;
                  const x = paddingLeft + idx * candleWidth + candleWidth / 2;
                  const y = getY(val);
                  return `${x},${y}`;
                })
                .filter(Boolean)
                .join(' ')}
            />
          )}

          {/* Current Live Price Line */}
          {currentPrice > 0 && (
            <g>
              <line
                x1={paddingLeft}
                y1={getY(currentPrice)}
                x2={800 - paddingRight}
                y2={getY(currentPrice)}
                stroke="#0ecb81"
                strokeDasharray="3 3"
                strokeWidth="1.2"
              />
              <rect
                x={800 - paddingRight}
                y={getY(currentPrice) - 9}
                width={paddingRight}
                height={18}
                fill="#0ecb81"
                rx="2"
              />
              <text
                x={800 - paddingRight + 6}
                y={getY(currentPrice) + 4}
                fill="#0b0e14"
                fontSize="10"
                fontWeight="bold"
                fontFamily="monospace"
              >
                {currentPrice.toFixed(2)}
              </text>
            </g>
          )}

          {/* Interactive Crosshairs */}
          {hoverPos && (
            <g>
              {/* Horizontal line */}
              <line
                x1={paddingLeft}
                y1={hoverPos.y}
                x2={800 - paddingRight}
                y2={hoverPos.y}
                stroke="#475569"
                strokeDasharray="2 2"
                strokeWidth="1"
              />
              {/* Vertical line */}
              <line
                x1={hoverPos.x}
                y1={paddingTop}
                x2={hoverPos.x}
                y2={height}
                stroke="#475569"
                strokeDasharray="2 2"
                strokeWidth="1"
              />
            </g>
          )}
        </svg>
      </div>
    </div>
  );
};
