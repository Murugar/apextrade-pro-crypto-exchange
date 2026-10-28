import React, { useState } from 'react';
import { 
  MarketTicker, 
  Candle, 
  OrderBookLevel, 
  Order, 
  Trade, 
  Position, 
  EngineMetrics,
  OrderSide,
  OrderType,
  TimeInForce
} from '../types/crypto';
import { CandleChart } from './CandleChart';
import { OrderBook } from './OrderBook';
import { TradeTape } from './TradeTape';
import { OrderForm } from './OrderForm';
import { OrdersAndPositions } from './OrdersAndPositions';
import { ChevronDown, ArrowUpRight, ArrowDownRight, Clock, ShieldCheck } from 'lucide-react';

interface TradingTerminalProps {
  currentSymbol: string;
  onSelectSymbol: (symbol: string) => void;
  allTickers: MarketTicker[];
  currentTicker: MarketTicker;
  candles: Candle[];
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  spread: number;
  spreadPct: number;
  recentTrades: Trade[];
  userOrders: Order[];
  triggerOrders: Order[];
  positions: Position[];
  engineMetrics: EngineMetrics;
  availableUsdt: number;
  availableBase: number;
  onPlaceOrder: (params: {
    side: OrderSide;
    type: OrderType;
    timeInForce: TimeInForce;
    price: number;
    amount: number;
    stopPrice?: number;
    trailingDelta?: number;
    postOnly: boolean;
    reduceOnly: boolean;
    leverage: number;
    mode: 'SPOT' | 'PERPETUAL';
  }) => { success: boolean; error?: string };
  onCancelOrder: (orderId: string) => void;
  onClosePosition: (positionId: string) => void;
}

export const TradingTerminal: React.FC<TradingTerminalProps> = ({
  currentSymbol,
  onSelectSymbol,
  allTickers,
  currentTicker,
  candles,
  bids,
  asks,
  spread,
  spreadPct,
  recentTrades,
  userOrders,
  triggerOrders,
  positions,
  engineMetrics,
  availableUsdt,
  availableBase,
  onPlaceOrder,
  onCancelOrder,
  onClosePosition,
}) => {
  const [selectedBookPrice, setSelectedBookPrice] = useState<number | null>(null);
  const [pairSelectorOpen, setPairSelectorOpen] = useState(false);

  const isPositive = currentTicker.change24h >= 0;

  return (
    <div className="flex flex-col flex-1 bg-[#0b0e14] overflow-hidden">
      {/* Pair Stats Header Bar */}
      <div className="bg-[#0e121b] border-b border-[#1c2230] px-4 py-2 flex flex-wrap items-center justify-between gap-4 select-none">
        {/* Pair Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => setPairSelectorOpen(!pairSelectorOpen)}
            className="flex items-center gap-2 hover:bg-[#161c28] px-2 py-1 rounded transition-colors"
          >
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm tracking-wide text-slate-100">{currentSymbol}</span>
              <span className="text-[10px] bg-[#1e2638] text-cyan-400 font-mono px-1.5 py-0.5 rounded border border-[#2e3b56]">
                Perp / Spot
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {/* Pair Dropdown Menu */}
          {pairSelectorOpen && (
            <div className="absolute left-0 top-full mt-1 w-64 bg-[#121722] border border-[#202738] rounded shadow-2xl z-50 py-1 font-mono text-xs">
              <div className="px-3 py-1.5 text-[10px] text-slate-400 border-b border-[#1c2230] uppercase">
                Select Trading Market
              </div>
              {allTickers.map(t => (
                <div
                  key={t.symbol}
                  onClick={() => {
                    onSelectSymbol(t.symbol);
                    setPairSelectorOpen(false);
                  }}
                  className={`flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-[#182030] transition-colors ${
                    t.symbol === currentSymbol ? 'bg-[#182030] text-cyan-400' : 'text-slate-200'
                  }`}
                >
                  <span className="font-bold">{t.symbol}</span>
                  <div className="text-right">
                    <div>${t.price.toFixed(t.priceDecimals)}</div>
                    <div className={`text-[10px] ${t.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {t.change24h >= 0 ? '+' : ''}{t.change24h}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 24h Market Stats Grid */}
        <div className="flex flex-wrap items-center gap-6 font-mono text-xs">
          {/* Last Price */}
          <div>
            <div className="text-[10px] text-slate-400 font-sans">MARKET PRICE</div>
            <div className={`text-base font-bold flex items-center ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
              {isPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
              ${currentTicker.price.toFixed(currentTicker.priceDecimals)}
            </div>
          </div>

          {/* 24h Change */}
          <div>
            <div className="text-[10px] text-slate-400 font-sans">24H CHANGE</div>
            <div className={isPositive ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
              {isPositive ? '+' : ''}{currentTicker.change24h}%
            </div>
          </div>

          {/* 24h High & Low */}
          <div className="hidden sm:block">
            <div className="text-[10px] text-slate-400 font-sans">24H HIGH / LOW</div>
            <div className="text-slate-200">
              <span className="text-emerald-400">${currentTicker.high24h.toFixed(currentTicker.priceDecimals)}</span>
              <span className="text-slate-600 mx-1">/</span>
              <span className="text-rose-400">${currentTicker.low24h.toFixed(currentTicker.priceDecimals)}</span>
            </div>
          </div>

          {/* 24h Volume */}
          <div className="hidden md:block">
            <div className="text-[10px] text-slate-400 font-sans">24H VOLUME ({currentTicker.baseAsset})</div>
            <div className="text-slate-200">
              {currentTicker.volume24h.toLocaleString('en-US', { maximumFractionDigits: 2 })}
            </div>
          </div>

          {/* Funding Rate & Countdown */}
          <div className="hidden lg:block border-l border-[#1c2230] pl-4">
            <div className="text-[10px] text-slate-400 font-sans flex items-center gap-1">
              <Clock className="w-3 h-3 text-cyan-400" />
              <span>FUNDING / 8H</span>
            </div>
            <div className="text-cyan-400 font-bold">
              {(currentTicker.fundingRate * 100).toFixed(4)}% in 03:42:15
            </div>
          </div>
        </div>
      </div>

      {/* Main Terminal Grid: Chart + Orderbook + Trades + Order Form */}
      <div className="flex-1 p-2 grid grid-cols-1 lg:grid-cols-12 gap-2 overflow-hidden min-h-0">
        {/* Left Column: Candlestick Chart (top) + Orders & Positions (bottom) */}
        <div className="lg:col-span-6 flex flex-col gap-2 min-h-0 overflow-hidden">
          <div className="h-[380px] shrink-0">
            <CandleChart
              candles={candles}
              symbol={currentSymbol}
              currentPrice={currentTicker.price}
              prevPrice={currentTicker.prevPrice}
            />
          </div>
          <div className="flex-1 min-h-[220px]">
            <OrdersAndPositions
              orders={userOrders}
              triggerOrders={triggerOrders}
              trades={recentTrades}
              positions={positions}
              engineMetrics={engineMetrics}
              onCancelOrder={onCancelOrder}
              onClosePosition={onClosePosition}
              priceDecimals={currentTicker.priceDecimals}
            />
          </div>
        </div>

        {/* Middle Column: Order Book */}
        <div className="lg:col-span-3 min-h-[400px] flex flex-col">
          <OrderBook
            bids={bids}
            asks={asks}
            spread={spread}
            spreadPct={spreadPct}
            lastPrice={currentTicker.price}
            prevPrice={currentTicker.prevPrice}
            onSelectPrice={setSelectedBookPrice}
            priceDecimals={currentTicker.priceDecimals}
            sizeDecimals={currentTicker.sizeDecimals}
          />
        </div>

        {/* Right Column: Order Entry Form (top) + Trade Tape (bottom) */}
        <div className="lg:col-span-3 flex flex-col gap-2 min-h-0 overflow-hidden">
          <div className="min-h-[380px]">
            <OrderForm
              ticker={currentTicker}
              selectedPrice={selectedBookPrice}
              availableUsdt={availableUsdt}
              availableBase={availableBase}
              onSubmitOrder={onPlaceOrder}
            />
          </div>
          <div className="flex-1 min-h-[220px]">
            <TradeTape
              trades={recentTrades}
              priceDecimals={currentTicker.priceDecimals}
              sizeDecimals={currentTicker.sizeDecimals}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
