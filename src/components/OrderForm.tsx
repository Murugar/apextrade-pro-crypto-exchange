import React, { useState, useEffect } from 'react';
import { OrderSide, OrderType, TimeInForce, MarketTicker } from '../types/crypto';
import { sound } from '../utils/sound';
import confetti from 'canvas-confetti';
import { Sliders, Shield, AlertTriangle } from 'lucide-react';

interface OrderFormProps {
  ticker: MarketTicker;
  selectedPrice: number | null;
  availableUsdt: number;
  availableBase: number;
  onSubmitOrder: (params: {
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
}

export const OrderForm: React.FC<OrderFormProps> = ({
  ticker,
  selectedPrice,
  availableUsdt,
  availableBase,
  onSubmitOrder,
}) => {
  const [mode, setMode] = useState<'SPOT' | 'PERPETUAL'>('SPOT');
  const [side, setSide] = useState<OrderSide>('BUY');
  const [orderType, setOrderType] = useState<OrderType>('LIMIT');
  const [timeInForce, setTimeInForce] = useState<TimeInForce>('GTC');

  const [priceInput, setPriceInput] = useState<string>(ticker.price.toString());
  const [amountInput, setAmountInput] = useState<string>('');
  const [stopPriceInput, setStopPriceInput] = useState<string>('');
  const [trailingDeltaInput, setTrailingDeltaInput] = useState<string>('1.5');
  const [leverage, setLeverage] = useState<number>(10);
  const [postOnly, setPostOnly] = useState<boolean>(false);
  const [reduceOnly, setReduceOnly] = useState<boolean>(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync selected price from order book click
  useEffect(() => {
    if (selectedPrice && selectedPrice > 0) {
      setPriceInput(selectedPrice.toFixed(ticker.priceDecimals));
    }
  }, [selectedPrice, ticker.priceDecimals]);

  // Set default price if empty
  useEffect(() => {
    if (!priceInput || priceInput === '0') {
      setPriceInput(ticker.price.toFixed(ticker.priceDecimals));
    }
  }, [ticker.price, ticker.priceDecimals]);

  const numPrice = orderType === 'MARKET' ? ticker.price : (parseFloat(priceInput) || 0);
  const numAmount = parseFloat(amountInput) || 0;
  const orderValue = numPrice * numAmount;
  const effectiveLeverage = mode === 'PERPETUAL' ? leverage : 1;
  const marginRequired = orderValue / effectiveLeverage;

  // Fee calculation (Maker: 0.02%, Taker: 0.05%)
  const isMaker = orderType === 'LIMIT' && !postOnly ? 0.0002 : (postOnly ? 0.0002 : 0.0005);
  const estimatedFee = orderValue * isMaker;

  // Liquidation price estimate for leveraged positions
  const liquidationPrice = mode === 'PERPETUAL' && numPrice > 0
    ? (side === 'BUY'
        ? numPrice * (1 - (1 / leverage) * 0.9)
        : numPrice * (1 + (1 / leverage) * 0.9))
    : 0;

  const handlePercentageClick = (pct: number) => {
    if (side === 'BUY') {
      const maxUsdt = mode === 'PERPETUAL' ? availableUsdt * leverage : availableUsdt;
      const targetSpend = maxUsdt * (pct / 100);
      if (numPrice > 0) {
        const calculatedAmount = targetSpend / numPrice;
        setAmountInput(calculatedAmount.toFixed(ticker.sizeDecimals));
      }
    } else {
      const maxBase = availableBase;
      const targetAmount = maxBase * (pct / 100);
      setAmountInput(targetAmount.toFixed(ticker.sizeDecimals));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (numAmount <= 0) {
      setErrorMessage(`Minimum amount is ${ticker.minOrderSize} ${ticker.baseAsset}`);
      return;
    }

    if (orderType !== 'MARKET' && numPrice <= 0) {
      setErrorMessage('Please specify a valid limit price');
      return;
    }

    const numStop = parseFloat(stopPriceInput) || undefined;
    const numTrailing = parseFloat(trailingDeltaInput) || undefined;

    const result = onSubmitOrder({
      side,
      type: orderType,
      timeInForce,
      price: numPrice,
      amount: numAmount,
      stopPrice: numStop,
      trailingDelta: numTrailing,
      postOnly,
      reduceOnly,
      leverage: effectiveLeverage,
      mode,
    });

    if (!result.success) {
      setErrorMessage(result.error || 'Failed to place order');
    } else {
      sound.playOrderPlaced();
      // Reset form slightly
      setAmountInput('');
      try {
        confetti({
          particleCount: 25,
          spread: 40,
          origin: { y: 0.8 },
          colors: side === 'BUY' ? ['#0ecb81', '#10b981', '#34d399'] : ['#f6465d', '#ef4444', '#f87171'],
        });
      } catch {
        // ignore
      }
    }
  };

  return (
    <div className="bg-[#0e121b] border border-[#1c2230] rounded flex flex-col h-full overflow-hidden select-none">
      {/* Spot vs Perpetuals Mode Selector */}
      <div className="grid grid-cols-2 border-b border-[#1c2230] bg-[#0b0e14] text-xs font-semibold">
        <button
          onClick={() => setMode('SPOT')}
          className={`py-2 text-center transition-colors border-b-2 ${
            mode === 'SPOT'
              ? 'border-cyan-400 text-cyan-400 bg-[#121722]'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Spot Market (1x)
        </button>
        <button
          onClick={() => setMode('PERPETUAL')}
          className={`py-2 text-center transition-colors border-b-2 ${
            mode === 'PERPETUAL'
              ? 'border-cyan-400 text-cyan-400 bg-[#121722]'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Perpetual Futures ({leverage}x)
        </button>
      </div>

      <div className="p-3 flex-1 flex flex-col justify-between overflow-y-auto">
        <div>
          {/* Buy / Sell Tabs */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#121722] rounded border border-[#1e2638] mb-3">
            <button
              onClick={() => setSide('BUY')}
              className={`py-1.5 text-xs font-bold rounded transition-all ${
                side === 'BUY'
                  ? 'bg-[#0ecb81] text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Buy / Long
            </button>
            <button
              onClick={() => setSide('SELL')}
              className={`py-1.5 text-xs font-bold rounded transition-all ${
                side === 'SELL'
                  ? 'bg-[#f6465d] text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sell / Short
            </button>
          </div>

          {/* Leverage Slider (Only in Perpetual mode) */}
          {mode === 'PERPETUAL' && (
            <div className="mb-3 p-2 bg-[#121722] rounded border border-[#1e2638]">
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="text-slate-400 flex items-center gap-1">
                  <Sliders className="w-3 h-3 text-cyan-400" />
                  Leverage
                </span>
                <span className="font-mono font-bold text-cyan-400">{leverage}x Cross</span>
              </div>
              <input
                type="range"
                min="1"
                max="100"
                step="1"
                value={leverage}
                onChange={(e) => setLeverage(Number(e.target.value))}
                className="w-full accent-cyan-400 h-1 bg-[#1e2638] rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-[9px] text-slate-400 mt-1 font-mono">
                <span>1x</span>
                <span>25x</span>
                <span>50x</span>
                <span>75x</span>
                <span>100x</span>
              </div>
            </div>
          )}

          {/* Order Type Selector */}
          <div className="grid grid-cols-3 gap-1 mb-3 text-[11px]">
            {(['LIMIT', 'MARKET', 'STOP_LIMIT'] as const).map(t => (
              <button
                key={t}
                onClick={() => setOrderType(t)}
                className={`py-1 rounded text-center font-medium border transition-colors ${
                  orderType === t
                    ? 'bg-[#1e2638] border-cyan-500/50 text-cyan-400'
                    : 'bg-[#121722] border-[#1e2638] text-slate-400 hover:text-slate-200'
                }`}
              >
                {t === 'STOP_LIMIT' ? 'Stop-Limit' : t}
              </button>
            ))}
          </div>

          {/* Form Fields */}
          <form onSubmit={handleSubmit} className="space-y-2.5">
            {/* Stop Price (if STOP_LIMIT) */}
            {orderType === 'STOP_LIMIT' && (
              <div>
                <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                  <span>Trigger Stop Price</span>
                  <span>USDT</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    value={stopPriceInput}
                    onChange={(e) => setStopPriceInput(e.target.value)}
                    placeholder="Trigger condition price"
                    className="w-full bg-[#121722] border border-[#1e2638] rounded px-3 py-1.5 text-xs text-slate-100 font-mono outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            )}

            {/* Price Field */}
            {orderType !== 'MARKET' ? (
              <div>
                <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                  <span>Order Limit Price</span>
                  <span className="font-mono text-cyan-400 cursor-pointer" onClick={() => setPriceInput(ticker.price.toFixed(ticker.priceDecimals))}>
                    Best: {ticker.price.toFixed(ticker.priceDecimals)}
                  </span>
                </div>
                <div className="relative flex items-center">
                  <input
                    type="number"
                    step="any"
                    value={priceInput}
                    onChange={(e) => setPriceInput(e.target.value)}
                    className="w-full bg-[#121722] border border-[#1e2638] rounded px-3 py-1.5 text-xs text-slate-100 font-mono outline-none focus:border-cyan-500"
                  />
                  <span className="absolute right-3 text-[10px] text-slate-500 font-mono">USDT</span>
                </div>
              </div>
            ) : (
              <div className="bg-[#121722] border border-[#1e2638] rounded px-3 py-2 text-xs text-slate-400 font-mono flex justify-between">
                <span>Execution Price</span>
                <span className="text-slate-200">Market (Best Available)</span>
              </div>
            )}

            {/* Amount Field */}
            <div>
              <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                <span>Amount</span>
                <span className="font-mono text-slate-300">
                  Avail: {side === 'BUY' ? `${availableUsdt.toFixed(2)} USDT` : `${availableBase.toFixed(4)} ${ticker.baseAsset}`}
                </span>
              </div>
              <div className="relative flex items-center">
                <input
                  type="number"
                  step="any"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  placeholder={`Min ${ticker.minOrderSize}`}
                  className="w-full bg-[#121722] border border-[#1e2638] rounded px-3 py-1.5 text-xs text-slate-100 font-mono outline-none focus:border-cyan-500"
                />
                <span className="absolute right-3 text-[10px] text-slate-500 font-mono">{ticker.baseAsset}</span>
              </div>
            </div>

            {/* Percentage shortcuts */}
            <div className="grid grid-cols-4 gap-1">
              {[25, 50, 75, 100].map(pct => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => handlePercentageClick(pct)}
                  className="py-0.5 rounded bg-[#151a24] hover:bg-[#1f2738] border border-[#202738] text-[10px] font-mono text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {pct}%
                </button>
              ))}
            </div>

            {/* Advanced flags: Post-Only, TimeInForce */}
            <div className="pt-1 flex items-center justify-between text-[11px] text-slate-400 border-t border-[#182030]">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={postOnly}
                  onChange={(e) => setPostOnly(e.target.checked)}
                  className="rounded border-[#1e2638] bg-[#121722] text-cyan-500 focus:ring-0"
                />
                <span>Post-Only</span>
              </label>

              <div className="flex items-center gap-1">
                <span>TIF:</span>
                <select
                  value={timeInForce}
                  onChange={(e) => setTimeInForce(e.target.value as TimeInForce)}
                  className="bg-[#121722] border border-[#1e2638] text-[10px] rounded px-1.5 py-0.5 outline-none font-mono text-slate-300"
                >
                  <option value="GTC">GTC</option>
                  <option value="IOC">IOC</option>
                  <option value="FOK">FOK</option>
                </select>
              </div>
            </div>

            {/* Error Message if any */}
            {errorMessage && (
              <div className="p-2 rounded bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[11px] flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              className={`w-full py-2.5 rounded font-bold text-xs uppercase tracking-wider transition-all shadow-lg ${
                side === 'BUY'
                  ? 'bg-[#0ecb81] hover:bg-[#0dae70] text-slate-950 shadow-emerald-500/20'
                  : 'bg-[#f6465d] hover:bg-[#e03a4f] text-white shadow-rose-500/20'
              }`}
            >
              {side === 'BUY' ? `Buy / Long ${ticker.baseAsset}` : `Sell / Short ${ticker.baseAsset}`}
            </button>
          </form>
        </div>

        {/* Order Summary & Financials */}
        <div className="mt-3 pt-2 border-t border-[#1a2232] text-[11px] space-y-1 font-mono text-slate-400">
          <div className="flex justify-between">
            <span>Order Notional:</span>
            <span className="text-slate-200">${orderValue.toFixed(2)} USDT</span>
          </div>
          {mode === 'PERPETUAL' && (
            <>
              <div className="flex justify-between">
                <span>Margin Required:</span>
                <span className="text-cyan-400 font-bold">${marginRequired.toFixed(2)} USDT</span>
              </div>
              {liquidationPrice > 0 && (
                <div className="flex justify-between">
                  <span>Est. Liquidation:</span>
                  <span className="text-amber-400">${liquidationPrice.toFixed(2)} USDT</span>
                </div>
              )}
            </>
          )}
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>Est. Fee (0.02% / 0.05%):</span>
            <span>~${estimatedFee.toFixed(3)} USDT</span>
          </div>
        </div>
      </div>
    </div>
  );
};
