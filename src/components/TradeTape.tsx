import React from 'react';
import { Trade } from '../types/crypto';

interface TradeTapeProps {
  trades: Trade[];
  priceDecimals: number;
  sizeDecimals: number;
}

export const TradeTape: React.FC<TradeTapeProps> = ({
  trades,
  priceDecimals,
  sizeDecimals,
}) => {
  return (
    <div className="bg-[#0e121b] border border-[#1c2230] rounded flex flex-col h-full overflow-hidden select-none">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#1c2230] px-3 py-1.5 bg-[#0b0e14] text-xs">
        <span className="font-semibold text-slate-200">Recent Trades</span>
        <span className="text-[10px] text-slate-400 font-mono">Live L3 Prints</span>
      </div>

      {/* Table Columns */}
      <div className="grid grid-cols-3 px-3 py-1 text-slate-400 text-[10px] uppercase border-b border-[#161c28] font-mono">
        <div>Price (USDT)</div>
        <div className="text-right">Size</div>
        <div className="text-right">Time</div>
      </div>

      {/* Trades List */}
      <div className="flex-1 overflow-y-auto space-y-[1px] font-mono text-[11px]">
        {trades.slice(0, 35).map((tr) => {
          const isBuy = tr.side === 'BUY';
          const timeStr = new Date(tr.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          });

          return (
            <div
              key={tr.id}
              className={`grid grid-cols-3 px-3 py-0.5 hover:bg-[#151c2a] transition-colors ${
                tr.isUserTrade ? 'bg-cyan-500/10 border-l-2 border-cyan-400' : ''
              }`}
            >
              <div className={isBuy ? 'text-emerald-400' : 'text-rose-400'}>
                {tr.price.toFixed(priceDecimals)}
              </div>
              <div className="text-right text-slate-300">
                {tr.amount.toFixed(sizeDecimals)}
              </div>
              <div className="text-right text-slate-400 text-[10px]">
                {timeStr}
              </div>
            </div>
          );
        })}

        {trades.length === 0 && (
          <div className="p-4 text-center text-xs text-slate-500">
            Waiting for trade execution flow...
          </div>
        )}
      </div>
    </div>
  );
};
