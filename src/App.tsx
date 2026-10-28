import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { MatchingEngine } from './engine/MatchingEngine';
import { LedgerService } from './engine/LedgerService';
import { MarketDataService } from './services/MarketDataService';
import { BlockchainService } from './services/BlockchainService';
import { SecurityService } from './services/SecurityService';
import { MarketMakerBot } from './services/MarketMakerBot';
import { 
  Order, 
  Trade, 
  Position, 
  OrderSide, 
  OrderType, 
  TimeInForce, 
  BlockchainType, 
  EngineMetrics 
} from './types/crypto';
import { Navbar, NavTab } from './components/Navbar';
import { TradingTerminal } from './components/TradingTerminal';
import { WalletCustody } from './components/WalletCustody';
import { LedgerAudit } from './components/LedgerAudit';
import { WebSocketInspector } from './components/WebSocketInspector';
import { SecurityCenter } from './components/SecurityCenter';
import { ArchitectureView } from './components/ArchitectureView';
import { ApiConsole } from './components/ApiConsole';
import { sound } from './utils/sound';

export default function App() {
  // Navigation
  const [activeTab, setActiveTab] = useState<NavTab>('terminal');
  const [currentSymbol, setCurrentSymbol] = useState<string>('BTC/USDT');

  // Core Subsystems (Persistent singleton refs)
  const ledgerRef = useRef<LedgerService>(new LedgerService());
  const marketDataRef = useRef<MarketDataService>(new MarketDataService());
  const blockchainRef = useRef<BlockchainService>(new BlockchainService());
  const securityRef = useRef<SecurityService>(new SecurityService());

  // Symbol-specific Matching Engines cache
  const enginesMapRef = useRef<Map<string, MatchingEngine>>(new Map());
  const getOrCreateEngine = useCallback((symbol: string) => {
    if (!enginesMapRef.current.has(symbol)) {
      const ticker = marketDataRef.current.getTicker(symbol);
      const engine = new MatchingEngine(symbol, ticker.price);
      engine.seedOrderBook(ticker.price, ticker.price > 1000 ? 4.0 : 0.05, 20);
      enginesMapRef.current.set(symbol, engine);
    }
    return enginesMapRef.current.get(symbol)!;
  }, []);

  const currentEngine = useMemo(() => {
    return getOrCreateEngine(currentSymbol);
  }, [currentSymbol, getOrCreateEngine]);

  // Market Maker Bot Ref
  const botRef = useRef<MarketMakerBot | null>(null);
  const [isBotRunning, setIsBotRunning] = useState<boolean>(true);

  // App Reactive State
  const [userOrders, setUserOrders] = useState<Order[]>([]);
  const [triggerOrders, setTriggerOrders] = useState<Order[]>([]);
  const [recentTrades, setRecentTrades] = useState<Trade[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [balanceTick, setBalanceTick] = useState<number>(0);

  // Order Book state
  const [bookDepth, setBookDepth] = useState(() => currentEngine.getDepth(20));

  // Engine Telemetry state
  const [engineMetrics, setEngineMetrics] = useState<EngineMetrics>({
    ordersProcessed: 14820,
    tradesMatched: 5120,
    avgMatchingLatencyUs: 38,
    peakLatencyUs: 64,
    queueDepth: 0,
    throughputPerSec: 62450,
    activeMemoryKb: 4820,
    systemStatus: 'ONLINE',
  });

  // Current ticker & candles
  const [tickerTick, setTickerTick] = useState(0);
  const currentTicker = marketDataRef.current.getTicker(currentSymbol);
  const candles = marketDataRef.current.getCandles(currentSymbol);
  const allTickers = marketDataRef.current.getAllTickers();

  // Price map for equity calculations
  const priceMap: Record<string, number> = useMemo(() => {
    const map: Record<string, number> = {};
    allTickers.forEach(t => { map[t.symbol] = t.price; });
    return map;
  }, [allTickers, tickerTick]);

  const userBalances = ledgerRef.current.getUserBalances(priceMap);
  const totalEquityUsd = userBalances.reduce((acc, b) => acc + b.usdValue, 0);
  const availableUsdt = ledgerRef.current.getBalance('USER:SPOT:AVAILABLE:USDT');
  const availableBase = ledgerRef.current.getBalance(`USER:SPOT:AVAILABLE:${currentTicker.baseAsset}`);

  // Initialize or re-bind Market Maker Bot when symbol changes
  useEffect(() => {
    if (botRef.current) {
      botRef.current.stop();
    }

    const bot = new MarketMakerBot(
      currentSymbol,
      currentEngine,
      marketDataRef.current,
      ledgerRef.current
    );

    botRef.current = bot;
    if (isBotRunning) {
      bot.start();
    }

    // Refresh local depth
    setBookDepth(currentEngine.getDepth(20));

    return () => {
      bot.stop();
    };
  }, [currentSymbol, currentEngine, isBotRunning]);

  // Periodic UI refresh ticker (book, trades, positions PnL)
  useEffect(() => {
    const interval = setInterval(() => {
      setBookDepth(currentEngine.getDepth(20));
      setTickerTick(Date.now());

      // Update Engine Telemetry
      setEngineMetrics(prev => ({
        ...prev,
        ordersProcessed: currentEngine.processedCount + 14820,
        tradesMatched: currentEngine.totalTradesCount + 5120,
        avgMatchingLatencyUs: currentEngine.getAvgLatencyUs(),
        peakLatencyUs: Math.max(prev.peakLatencyUs, currentEngine.peakLatencyUs),
        queueDepth: currentEngine.getOrderCount(),
      }));

      // Update Unrealized PnL on open perpetual positions
      setPositions(prev =>
        prev.map(pos => {
          const tick = marketDataRef.current.getTicker(pos.symbol);
          const currentPrice = tick.price;
          const priceDiff = pos.side === 'LONG' ? (currentPrice - pos.entryPrice) : (pos.entryPrice - currentPrice);
          const unrealizedPnl = priceDiff * pos.size;
          const pnlPercentage = pos.margin > 0 ? (unrealizedPnl / pos.margin) * 100 : 0;
          return {
            ...pos,
            markPrice: currentPrice,
            unrealizedPnl: Number(unrealizedPnl.toFixed(2)),
            pnlPercentage: Number(pnlPercentage.toFixed(2)),
          };
        })
      );
    }, 250);

    return () => clearInterval(interval);
  }, [currentEngine]);

  // Toggle Bot Simulation
  const handleToggleBot = () => {
    if (isBotRunning) {
      botRef.current?.stop();
      setIsBotRunning(false);
    } else {
      botRef.current?.start();
      setIsBotRunning(true);
    }
  };

  // Switch Symbol
  const handleSelectSymbol = (sym: string) => {
    setCurrentSymbol(sym);
    setBookDepth(getOrCreateEngine(sym).getDepth(20));
  };

  // Place Order Handler
  const handlePlaceOrder = (params: {
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
  }): { success: boolean; error?: string } => {
    // 1. Rate Limiter & Edge check
    const rateCheck = securityRef.current.checkRateLimit(1);
    if (!rateCheck.allowed) {
      return { success: false, error: `Rate limited (HTTP 429). Retry in ${rateCheck.retryAfterMs}ms` };
    }

    // 2. Risk Engine & Price Band check
    const riskCheck = securityRef.current.inspectOrderRisk({
      symbol: currentSymbol,
      side: params.side,
      price: params.price,
      amount: params.amount,
      currentMarketPrice: currentTicker.price,
    });
    if (!riskCheck.passed) {
      return { success: false, error: riskCheck.reason };
    }

    // 3. Balance Locking
    const orderCost = params.price * params.amount;
    const orderId = `ord_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    if (params.mode === 'SPOT') {
      if (params.side === 'BUY') {
        // Must lock USDT
        const locked = ledgerRef.current.lockForOrder('USDT', orderCost, orderId);
        if (!locked) {
          return { success: false, error: `Insufficient USDT balance. Need $${orderCost.toFixed(2)}` };
        }
      } else {
        // Must lock base crypto
        const locked = ledgerRef.current.lockForOrder(currentTicker.baseAsset, params.amount, orderId);
        if (!locked) {
          return { success: false, error: `Insufficient ${currentTicker.baseAsset} balance. Need ${params.amount}` };
        }
      }
    } else {
      // Perpetual margin check
      const requiredMargin = orderCost / params.leverage;
      const locked = ledgerRef.current.lockForOrder('USDT', requiredMargin, orderId);
      if (!locked) {
        return { success: false, error: `Insufficient margin. Need $${requiredMargin.toFixed(2)} USDT` };
      }
    }

    // 4. Construct Order Object
    const newOrder: Order = {
      id: orderId,
      clientOrderId: `cl_${orderId}`,
      symbol: currentSymbol,
      side: params.side,
      type: params.type,
      timeInForce: params.timeInForce,
      price: params.price,
      stopPrice: params.stopPrice,
      trailingDelta: params.trailingDelta,
      amount: params.amount,
      filled: 0,
      remaining: params.amount,
      cost: 0,
      fee: 0,
      status: 'OPEN',
      postOnly: params.postOnly,
      reduceOnly: params.reduceOnly,
      timestamp: Date.now(),
      updatedAt: Date.now(),
      isUserOrder: true,
    };

    // 5. Submit into Matching Engine
    const result = currentEngine.processOrder(newOrder);

    // If order was rejected or canceled immediately
    if (result.filledOrder.status === 'REJECTED' || result.filledOrder.status === 'CANCELED') {
      // Unlock balance
      if (params.mode === 'SPOT') {
        const assetToUnlock = params.side === 'BUY' ? 'USDT' : currentTicker.baseAsset;
        const amountToUnlock = params.side === 'BUY' ? orderCost : params.amount;
        ledgerRef.current.unlockForOrder(assetToUnlock, amountToUnlock, orderId);
      } else {
        const requiredMargin = orderCost / params.leverage;
        ledgerRef.current.unlockForOrder('USDT', requiredMargin, orderId);
      }
      return { success: false, error: `Order ${result.filledOrder.status.toLowerCase()} by matching engine (Post-Only or FOK)` };
    }

    // 6. Handle Executed Trades (Fills)
    if (result.trades.length > 0) {
      sound.playOrderFilled();

      for (const tr of result.trades) {
        marketDataRef.current.updatePriceFromTrade(currentSymbol, tr);
        setRecentTrades(prev => [tr, ...prev.slice(0, 50)]);

        // Settle Spot Trade in Ledger
        if (params.mode === 'SPOT') {
          ledgerRef.current.settleTrade(
            params.side,
            currentTicker.baseAsset,
            currentTicker.quoteAsset,
            tr.amount,
            tr.cost,
            tr.takerFee,
            orderId
          );
        } else {
          // Open or increase perpetual position
          const posSide = params.side === 'BUY' ? 'LONG' : 'SHORT';
          const posMargin = tr.cost / params.leverage;
          const liqPrice = posSide === 'LONG'
            ? tr.price * (1 - (1 / params.leverage) * 0.9)
            : tr.price * (1 + (1 / params.leverage) * 0.9);

          const newPosition: Position = {
            id: `pos_${Date.now()}`,
            symbol: currentSymbol,
            side: posSide,
            size: tr.amount,
            entryPrice: tr.price,
            markPrice: tr.price,
            leverage: params.leverage,
            margin: posMargin,
            liquidationPrice: Number(liqPrice.toFixed(2)),
            unrealizedPnl: 0,
            pnlPercentage: 0,
            timestamp: Date.now(),
          };

          setPositions(prev => [newPosition, ...prev]);
        }
      }
    }

    // Update User Orders state
    if (result.filledOrder.type === 'STOP_LIMIT' || result.filledOrder.type === 'STOP_MARKET') {
      setTriggerOrders(currentEngine.getTriggerOrders());
    } else {
      setUserOrders(prev => [result.filledOrder, ...prev]);
    }

    setBookDepth(currentEngine.getDepth(20));
    setBalanceTick(Date.now());

    return { success: true };
  };

  // Cancel Order Handler
  const handleCancelOrder = (orderId: string) => {
    const canceled = currentEngine.cancelOrder(orderId);
    if (canceled) {
      // Unlock remaining balance in ledger
      const isBuy = canceled.side === 'BUY';
      const asset = isBuy ? 'USDT' : currentTicker.baseAsset;
      const amount = isBuy ? canceled.remaining * canceled.price : canceled.remaining;
      ledgerRef.current.unlockForOrder(asset, amount, orderId);

      setUserOrders(prev =>
        prev.map(o => (o.id === orderId ? { ...o, status: 'CANCELED' } : o))
      );
      setTriggerOrders(currentEngine.getTriggerOrders());
      setBookDepth(currentEngine.getDepth(20));
      setBalanceTick(Date.now());
    }
  };

  // Close Position Handler
  const handleClosePosition = (positionId: string) => {
    const pos = positions.find(p => p.id === positionId);
    if (!pos) return;

    // Realize PnL and return margin + PnL to Available USDT
    const totalReturn = pos.margin + pos.unrealizedPnl;
    if (totalReturn > 0) {
      ledgerRef.current.recordJournalEntry({
        type: 'TRADE_EXEC',
        asset: 'USDT',
        accountFrom: 'SYSTEM:CLEARING:COUNTERPARTY',
        accountTo: 'USER:SPOT:AVAILABLE:USDT',
        amount: totalReturn,
        referenceId: pos.id,
        note: `Closed ${pos.leverage}x ${pos.side} position on ${pos.symbol}. Realized PnL: ${pos.unrealizedPnl >= 0 ? '+' : ''}$${pos.unrealizedPnl.toFixed(2)}`,
      });
    }

    setPositions(prev => prev.filter(p => p.id !== positionId));
    sound.playOrderFilled();
    setBalanceTick(Date.now());
  };

  // Confirmed On-Chain Deposit Handler
  const handleDepositConfirmed = (asset: string, amount: number, txHash: string, chain: BlockchainType) => {
    ledgerRef.current.processConfirmedDeposit(asset, amount, txHash, chain);
    setBalanceTick(Date.now());
  };

  // Withdrawal Handler
  const handleRequestWithdrawal = (
    asset: string,
    chain: BlockchainType,
    amount: number,
    address: string
  ) => {
    const config = blockchainRef.current.getChainConfig(chain);
    const result = ledgerRef.current.processWithdrawal(asset, amount, config.withdrawalFee, address, chain);
    if (result.success && result.txHash) {
      blockchainRef.current.broadcastWithdrawal(asset, chain, amount, address);
      setBalanceTick(Date.now());
      sound.playOrderFilled();
    }
    return result;
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0b0e14] text-slate-100 overflow-hidden font-sans">
      {/* Institutional Navbar */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        totalEquityUsd={totalEquityUsd}
        availableUsdt={availableUsdt}
        isBotRunning={isBotRunning}
        onToggleBot={handleToggleBot}
        avgLatencyUs={engineMetrics.avgMatchingLatencyUs}
      />

      {/* Main View Router */}
      <main className="flex-1 flex overflow-hidden">
        {activeTab === 'terminal' && (
          <TradingTerminal
            currentSymbol={currentSymbol}
            onSelectSymbol={handleSelectSymbol}
            allTickers={allTickers}
            currentTicker={currentTicker}
            candles={candles}
            bids={bookDepth.bids}
            asks={bookDepth.asks}
            spread={bookDepth.spread}
            spreadPct={bookDepth.spreadPct}
            recentTrades={recentTrades}
            userOrders={userOrders}
            triggerOrders={triggerOrders}
            positions={positions}
            engineMetrics={engineMetrics}
            availableUsdt={availableUsdt}
            availableBase={availableBase}
            onPlaceOrder={handlePlaceOrder}
            onCancelOrder={handleCancelOrder}
            onClosePosition={handleClosePosition}
          />
        )}

        {activeTab === 'custody' && (
          <WalletCustody
            userBalances={userBalances}
            blockchainService={blockchainRef.current}
            transactions={blockchainRef.current.getTransactions()}
            vaultReserves={ledgerRef.current.vaultReserves}
            onDepositConfirmed={handleDepositConfirmed}
            onRequestWithdrawal={handleRequestWithdrawal}
          />
        )}

        {activeTab === 'ledger' && (
          <LedgerAudit
            ledgerService={ledgerRef.current}
            journal={ledgerRef.current.getJournal()}
          />
        )}

        {activeTab === 'websocket' && (
          <WebSocketInspector
            marketDataService={marketDataRef.current}
            currentSymbol={currentSymbol}
          />
        )}

        {activeTab === 'security' && (
          <SecurityCenter
            securityService={securityRef.current}
            currentSymbol={currentSymbol}
          />
        )}

        {activeTab === 'architecture' && <ArchitectureView />}

        {activeTab === 'api' && (
          <ApiConsole
            engine={currentEngine}
            marketDataService={marketDataRef.current}
            ledgerService={ledgerRef.current}
            currentSymbol={currentSymbol}
          />
        )}
      </main>
    </div>
  );
}
