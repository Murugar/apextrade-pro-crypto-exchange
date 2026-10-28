import React, { useState } from 'react';
import { OrderBookLevel } from '../types/crypto';
import { ArrowUp, ArrowDown } from 'lucide-react';

interface OrderBookProps {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  spread: number;
  spreadPct: number;
  lastPrice: number;
  prevPrice: number;
  onSelectPrice: (price: number) => void;
  priceDecimals: number;
  sizeDecimals: number;
}

export const OrderBook: React.FC<OrderBookProps> = ({
  bids,
  asks,
  spread,
  spreadPct,
  lastPrice,
  prevPrice,
  onSelectPrice,
  priceDecimals,
  sizeDecimals,
}) => {
  const [viewMode, setViewMode] = useState<'book' | 'depth'>('book');
  const [tickAggregation, setTickAggregation] = useState<number>(0.5);

  const isPriceUp = lastPrice >= prevPrice;

  // Take top 10 asks and reverse so lowest ask is at bottom (closest to spread)
  const displayAsks = [...asks].slice(0, 11).reverse();
  const displayBids = [...bids].slice(0, 11);

  return (
    <div className="bg-[#0e121b] border border-[#1c2230] rounded flex flex-col h-full overflow-hidden select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-[#1c2230] px-3 py-1.5 bg-[#0b0e14] text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-200">Order Book</span>
          <div className="flex items-center gap-1 bg-[#151a24] p-0.5 rounded border border-[#202738] text-[10px]">
            <button
              onClick={() => setViewMode('book')}
              className={`px-1.5 py-0.5 rounded ${viewMode === 'book' ? 'bg-[#222b3d] text-cyan-400 font-semibold' : 'text-slate-400'}`}
            >
              L2 Ladder
            </button>
            <button
              onClick={() => setViewMode('depth')}
              className={`px-1.5 py-0.5 rounded ${viewMode === 'depth' ? 'bg-[#222b3d] text-cyan-400 font-semibold' : 'text-slate-400'}`}
            >
              Depth Curve
            </button>
          </div>
        </div>

        {/* Aggregation */}
        <select
          value={tickAggregation}
          onChange={(e) => setTickAggregation(Number(e.target.value))}
          className="bg-[#151a24] border border-[#202738] text-[11px] text-slate-300 rounded px-1.5 py-0.5 outline-none font-mono"
        >
          <option value={0.1}>0.1</option>
          <option value={0.5}>0.5</option>
          <option value={1.0}>1.0</option>
          <option value={5.0}>5.0</option>
        </select>
      </div>

      {viewMode === 'book' ? (
        <div className="flex flex-col flex-1 text-[11px] font-mono overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-3 px-3 py-1 text-slate-400 text-[10px] uppercase border-b border-[#161c28]">
            <div>Price (USDT)</div>
            <div className="text-right">Size</div>
            <div className="text-right">Total</div>
          </div>

          {/* Asks (Sell Orders - Red) */}
          <div className="flex-1 overflow-hidden flex flex-col justify-end space-y-[1px]">
            {displayAsks.map((ask) => (
              <div
                key={`ask_${ask.price}`}
                onClick={() => onSelectPrice(ask.price)}
                className="relative grid grid-cols-3 px-3 py-0.5 cursor-pointer hover:bg-rose-500/10 transition-colors group"
              >
                {/* Visual Depth Bar */}
                <div
                  className="absolute right-0 top-0 bottom-0 bg-rose-500/15 pointer-events-none transition-all duration-150"
                  style={{ width: `${Math.min(100, ask.depthPct)}%` }}
                />
                <div className="text-rose-400 font-medium z-10 group-hover:underline">
                  {ask.price.toFixed(priceDecimals)}
                </div>
                <div className="text-right text-slate-300 z-10">
                  {ask.amount.toFixed(sizeDecimals)}
                </div>
                <div className="text-right text-slate-400 z-10">
                  {ask.total.toFixed(sizeDecimals)}
                </div>
              </div>
            ))}
          </div>

          {/* Mid Market Spread Bar */}
          <div className="flex items-center justify-between px-3 py-1.5 my-0.5 bg-[#121724] border-y border-[#1c2438]">
            <div className="flex items-center gap-1.5">
              <span
                className={`text-sm font-bold flex items-center ${
                  isPriceUp ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {isPriceUp ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
                {lastPrice.toFixed(priceDecimals)}
              </span>
              <span className="text-[10px] text-slate-400 font-sans">USD</span>
            </div>
            <div className="text-[10px] text-slate-400 flex items-center gap-1">
              <span>Spread:</span>
              <span className="font-mono text-slate-200">{spread.toFixed(2)}</span>
              <span className="text-slate-500 font-sans">({spreadPct.toFixed(3)}%)</span>
            </div>
          </div>

          {/* Bids (Buy Orders - Green) */}
          <div className="flex-1 overflow-hidden space-y-[1px]">
            {displayBids.map((bid) => (
              <div
                key={`bid_${bid.price}`}
                onClick={() => onSelectPrice(bid.price)}
                className="relative grid grid-cols-3 px-3 py-0.5 cursor-pointer hover:bg-emerald-500/10 transition-colors group"
              >
                {/* Visual Depth Bar */}
                <div
                  className="absolute right-0 top-0 bottom-0 bg-emerald-500/15 pointer-events-none transition-all duration-150"
                  style={{ width: `${Math.min(100, bid.depthPct)}%` }}
                />
                <div className="text-emerald-400 font-medium z-10 group-hover:underline">
                  {bid.price.toFixed(priceDecimals)}
                </div>
                <div className="text-right text-slate-300 z-10">
                  {bid.amount.toFixed(sizeDecimals)}
                </div>
                <div className="text-right text-slate-400 z-10">
                  {bid.total.toFixed(sizeDecimals)}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Depth Curve Chart */
        <div className="flex-1 p-2 flex flex-col justify-center">
          <svg className="w-full h-48" viewBox="0 0 300 150">
            {/* Green Bids Area */}
            <polygon
              fill="rgba(14, 203, 129, 0.25)"
              stroke="#0ecb81"
              strokeWidth="1.5"
              points={`0,150 ${displayBids
                .slice()
                .reverse()
                .map((b, i, arr) => `${(i / arr.length) * 145},${150 - (b.depthPct / 100) * 120}`)
                .join(' ')} 145,150`}
            />

            {/* Red Asks Area */}
            <polygon
              fill="rgba(246, 70, 93, 0.25)"
              stroke="#f6465d"
              strokeWidth="1.5"
              points={`155,150 ${displayAsks
                .slice()
                .reverse()
                .map((a, i, arr) => `${155 + (i / arr.length) * 145},${150 - (a.depthPct / 100) * 120}`)
                .join(' ')} 300,150`}
            />

            {/* Center Mid-Price Line */}
            <line x1="150" y1="10" x2="150" y2="150" stroke="#334155" strokeDasharray="3 3" />
            <text x="150" y="20" fill="#94a3b8" fontSize="8" textAnchor="middle" fontFamily="monospace">
              Mid {lastPrice.toFixed(2)}
            </text>
          </svg>
          <div className="flex justify-between text-[10px] text-slate-400 font-mono px-2 pt-2 border-t border-[#1a2232]">
            <span className="text-emerald-400">Total Bids Liquidity</span>
            <span className="text-rose-400">Total Asks Liquidity</span>
          </div>
        </div>
      )}
    </div>
  );
};
