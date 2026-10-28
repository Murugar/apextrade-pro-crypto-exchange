import { MatchingEngine } from '../engine/MatchingEngine';
import { MarketDataService } from './MarketDataService';
import { LedgerService } from '../engine/LedgerService';
import { Order } from '../types/crypto';

export class MarketMakerBot {
  private engine: MatchingEngine;
  private marketData: MarketDataService;
  private ledger: LedgerService;
  private intervalId: any = null;
  public isRunning: boolean = false;
  public speedMs: number = 800; // tick every 800ms
  public symbol: string;
  public onUserOrderFilled?: (order: Order) => void;

  constructor(
    symbol: string,
    engine: MatchingEngine,
    marketData: MarketDataService,
    ledger: LedgerService
  ) {
    this.symbol = symbol;
    this.engine = engine;
    this.marketData = marketData;
    this.ledger = ledger;
  }

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;

    this.intervalId = setInterval(() => {
      this.tick();
    }, this.speedMs);
  }

  public stop() {
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  public setSpeed(speedMs: number) {
    this.speedMs = speedMs;
    if (this.isRunning) {
      this.stop();
      this.start();
    }
  }

  /**
   * One tick of market maker activity:
   * - Maintain tight spread on orderbook
   * - Occasionally execute a market taker order (simulating public flow)
   * - Broadcast updates
   */
  public tick() {
    const ticker = this.marketData.getTicker(this.symbol);
    const bestBid = this.engine.getBestBid() || ticker.price * 0.999;
    const bestAsk = this.engine.getBestAsk() || ticker.price * 1.001;
    const midPrice = (bestBid + bestAsk) / 2;

    // Small random walk on mid price
    const drift = (Math.random() - 0.495) * (midPrice * 0.0004);
    const targetPrice = midPrice + drift;

    // 1. Maintain liquidity: add 1-2 small limit orders around spread
    const side = Math.random() > 0.5 ? 'BUY' : 'SELL';
    const tick = ticker.tickSize;

    if (side === 'BUY') {
      const price = Number((targetPrice - (Math.random() * 3 + 1) * tick).toFixed(ticker.priceDecimals));
      const amount = Number((0.05 + Math.random() * 0.8).toFixed(ticker.sizeDecimals));
      const botOrder: Order = {
        id: `bot_b_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        clientOrderId: `bot_mm_b`,
        symbol: this.symbol,
        side: 'BUY',
        type: 'LIMIT',
        timeInForce: 'GTC',
        price,
        amount,
        filled: 0,
        remaining: amount,
        cost: 0,
        fee: 0,
        status: 'OPEN',
        timestamp: Date.now(),
        updatedAt: Date.now(),
        isUserOrder: false,
      };
      this.engine.processOrder(botOrder);
    } else {
      const price = Number((targetPrice + (Math.random() * 3 + 1) * tick).toFixed(ticker.priceDecimals));
      const amount = Number((0.05 + Math.random() * 0.8).toFixed(ticker.sizeDecimals));
      const botOrder: Order = {
        id: `bot_a_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        clientOrderId: `bot_mm_a`,
        symbol: this.symbol,
        side: 'SELL',
        type: 'LIMIT',
        timeInForce: 'GTC',
        price,
        amount,
        filled: 0,
        remaining: amount,
        cost: 0,
        fee: 0,
        status: 'OPEN',
        timestamp: Date.now(),
        updatedAt: Date.now(),
        isUserOrder: false,
      };
      this.engine.processOrder(botOrder);
    }

    // 2. Chance of public taker trade (40% per tick)
    if (Math.random() < 0.4) {
      const takerSide = Math.random() > 0.5 ? 'BUY' : 'SELL';
      const takerAmount = Number((0.02 + Math.random() * 0.35).toFixed(ticker.sizeDecimals));
      const marketPrice = takerSide === 'BUY' ? bestAsk : bestBid;

      const takerOrder: Order = {
        id: `bot_taker_${Date.now()}`,
        clientOrderId: `bot_taker`,
        symbol: this.symbol,
        side: takerSide,
        type: 'MARKET',
        timeInForce: 'IOC',
        price: marketPrice,
        amount: takerAmount,
        filled: 0,
        remaining: takerAmount,
        cost: 0,
        fee: 0,
        status: 'OPEN',
        timestamp: Date.now(),
        updatedAt: Date.now(),
        isUserOrder: false,
      };

      const result = this.engine.processOrder(takerOrder);

      // If trades occurred, update market data
      if (result.trades.length > 0) {
        for (const tr of result.trades) {
          this.marketData.updatePriceFromTrade(this.symbol, tr);

          // If a user order was matched as maker, trigger user fill callback and settle ledger
          if (tr.isUserTrade) {
            // Settle user side in ledger
            const userSide = tr.side === 'BUY' ? 'SELL' : 'BUY';
            const baseAsset = ticker.baseAsset;
            const quoteAsset = ticker.quoteAsset;
            this.ledger.settleTrade(
              userSide,
              baseAsset,
              quoteAsset,
              tr.amount,
              tr.cost,
              tr.makerFee,
              tr.makerOrderId
            );
          }
        }
      }
    }

    // Broadcast L2 depth snapshot update over WebSocket
    const depth = this.engine.getDepth(20);
    const streamSymbol = this.symbol.replace('/', '').toLowerCase();
    this.marketData.broadcast(`${streamSymbol}@depth20@100ms`, {
      e: 'depthUpdate',
      E: Date.now(),
      s: streamSymbol.toUpperCase(),
      bids: depth.bids.map(b => [b.price.toString(), b.amount.toString()]),
      asks: depth.asks.map(a => [a.price.toString(), a.amount.toString()]),
    });
  }
}
