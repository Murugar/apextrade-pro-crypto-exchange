import { MarketTicker, Candle, Trade } from '../types/crypto';

export interface WSMessage {
  id: string;
  stream: string;
  timestamp: number;
  data: any;
  latencyMs: number;
}

export type WSListener = (msg: WSMessage) => void;

export class MarketDataService {
  private tickers: Map<string, MarketTicker> = new Map();
  private candleHistory: Map<string, Candle[]> = new Map();
  private subscribers: Map<string, Set<WSListener>> = new Map();
  private recentMessages: WSMessage[] = [];
  public streamLatencyMs: number = 25;
  public simulatedJitterMs: number = 5;
  public isStreamPaused: boolean = false;
  public packetDropRate: number = 0; // 0%
  public totalFramesSent: number = 0;
  public totalBytesSent: number = 0;

  constructor() {
    this.initTickers();
    this.generateInitialCandles();
  }

  private initTickers() {
    const defaultTickers: MarketTicker[] = [
      {
        symbol: 'BTC/USDT',
        baseAsset: 'BTC',
        quoteAsset: 'USDT',
        price: 68450.0,
        prevPrice: 67120.0,
        change24h: 1.98,
        high24h: 69200.0,
        low24h: 66850.0,
        volume24h: 28450.45,
        volumeQuote24h: 1947433302,
        markPrice: 68452.1,
        indexPrice: 68449.5,
        fundingRate: 0.0001, // +0.01%
        nextFundingTimestamp: Date.now() + 4 * 3600 * 1000,
        priceDecimals: 2,
        sizeDecimals: 4,
        minOrderSize: 0.001,
        tickSize: 0.5,
      },
      {
        symbol: 'ETH/USDT',
        baseAsset: 'ETH',
        quoteAsset: 'USDT',
        price: 3450.25,
        prevPrice: 3380.0,
        change24h: 2.08,
        high24h: 3510.0,
        low24h: 3360.0,
        volume24h: 142300.12,
        volumeQuote24h: 490935415,
        markPrice: 3451.0,
        indexPrice: 3450.1,
        fundingRate: 0.00012,
        nextFundingTimestamp: Date.now() + 4 * 3600 * 1000,
        priceDecimals: 2,
        sizeDecimals: 3,
        minOrderSize: 0.01,
        tickSize: 0.1,
      },
      {
        symbol: 'SOL/USDT',
        baseAsset: 'SOL',
        quoteAsset: 'USDT',
        price: 182.4,
        prevPrice: 175.2,
        change24h: 4.11,
        high24h: 186.5,
        low24h: 173.8,
        volume24h: 890450.0,
        volumeQuote24h: 162418080,
        markPrice: 182.45,
        indexPrice: 182.38,
        fundingRate: 0.00015,
        nextFundingTimestamp: Date.now() + 4 * 3600 * 1000,
        priceDecimals: 2,
        sizeDecimals: 2,
        minOrderSize: 0.1,
        tickSize: 0.05,
      },
      {
        symbol: 'AVAX/USDT',
        baseAsset: 'AVAX',
        quoteAsset: 'USDT',
        price: 34.65,
        prevPrice: 35.2,
        change24h: -1.56,
        high24h: 36.1,
        low24h: 33.9,
        volume24h: 450120.0,
        volumeQuote24h: 15596658,
        markPrice: 34.66,
        indexPrice: 34.64,
        fundingRate: 0.00008,
        nextFundingTimestamp: Date.now() + 4 * 3600 * 1000,
        priceDecimals: 2,
        sizeDecimals: 2,
        minOrderSize: 0.1,
        tickSize: 0.01,
      },
      {
        symbol: 'DOGE/USDT',
        baseAsset: 'DOGE',
        quoteAsset: 'USDT',
        price: 0.1452,
        prevPrice: 0.1388,
        change24h: 4.61,
        high24h: 0.152,
        low24h: 0.137,
        volume24h: 21500000.0,
        volumeQuote24h: 3121800,
        markPrice: 0.1453,
        indexPrice: 0.1451,
        fundingRate: 0.0002,
        nextFundingTimestamp: Date.now() + 4 * 3600 * 1000,
        priceDecimals: 4,
        sizeDecimals: 0,
        minOrderSize: 10,
        tickSize: 0.0001,
      },
    ];

    for (const t of defaultTickers) {
      this.tickers.set(t.symbol, t);
    }
  }

  private generateInitialCandles() {
    for (const [symbol, ticker] of this.tickers.entries()) {
      const candles: Candle[] = [];
      let currentPrice = ticker.price * 0.96;
      const now = Date.now();
      const intervalMs = 60 * 1000; // 1m candles
      const count = 75;

      for (let i = count; i >= 0; i--) {
        const time = now - i * intervalMs;
        const volatility = currentPrice * 0.0025;
        const change = (Math.random() - 0.48) * volatility;
        const open = currentPrice;
        const close = currentPrice + change;
        const high = Math.max(open, close) + Math.random() * volatility * 0.6;
        const low = Math.min(open, close) - Math.random() * volatility * 0.6;
        const volume = Number((1.5 + Math.random() * 8.5).toFixed(3));

        candles.push({
          time,
          open: Number(open.toFixed(ticker.priceDecimals)),
          high: Number(high.toFixed(ticker.priceDecimals)),
          low: Number(low.toFixed(ticker.priceDecimals)),
          close: Number(close.toFixed(ticker.priceDecimals)),
          volume,
        });

        currentPrice = close;
      }

      // Ensure last candle close matches current ticker
      const lastCandle = candles[candles.length - 1];
      if (lastCandle) {
        lastCandle.close = ticker.price;
        lastCandle.high = Math.max(lastCandle.high, ticker.price);
        lastCandle.low = Math.min(lastCandle.low, ticker.price);
      }

      this.candleHistory.set(symbol, candles);
    }
  }

  public getTicker(symbol: string): MarketTicker {
    return this.tickers.get(symbol) || this.tickers.get('BTC/USDT')!;
  }

  public getAllTickers(): MarketTicker[] {
    return Array.from(this.tickers.values());
  }

  public getCandles(symbol: string): Candle[] {
    return this.candleHistory.get(symbol) || [];
  }

  public updatePriceFromTrade(symbol: string, trade: Trade) {
    const ticker = this.tickers.get(symbol);
    if (!ticker) return;

    ticker.prevPrice = ticker.price;
    ticker.price = trade.price;
    ticker.markPrice = Number((trade.price * (1 + (Math.random() - 0.5) * 0.0003)).toFixed(ticker.priceDecimals));
    ticker.indexPrice = Number((trade.price * (1 + (Math.random() - 0.5) * 0.0002)).toFixed(ticker.priceDecimals));
    ticker.volume24h += trade.amount;
    ticker.volumeQuote24h += trade.cost;

    if (trade.price > ticker.high24h) ticker.high24h = trade.price;
    if (trade.price < ticker.low24h) ticker.low24h = trade.price;

    const baseRef = ticker.high24h - (ticker.high24h - ticker.low24h) * 0.5;
    ticker.change24h = Number((((ticker.price - baseRef) / baseRef) * 100).toFixed(2));

    // Update active candle
    const candles = this.candleHistory.get(symbol);
    if (candles && candles.length > 0) {
      const active = candles[candles.length - 1];
      const now = Date.now();
      if (now - active.time < 60 * 1000) {
        active.close = trade.price;
        active.high = Math.max(active.high, trade.price);
        active.low = Math.min(active.low, trade.price);
        active.volume += trade.amount;
      } else {
        // Start new candle
        candles.push({
          time: now,
          open: trade.price,
          high: trade.price,
          low: trade.price,
          close: trade.price,
          volume: trade.amount,
        });
        if (candles.length > 100) candles.shift();
      }
    }

    // Broadcast WebSocket updates
    const streamSymbol = symbol.replace('/', '').toLowerCase();
    this.broadcast(`${streamSymbol}@ticker`, {
      e: '24hrTicker',
      E: Date.now(),
      s: streamSymbol.toUpperCase(),
      c: ticker.price.toString(),
      h: ticker.high24h.toString(),
      l: ticker.low24h.toString(),
      v: ticker.volume24h.toFixed(2),
      q: ticker.volumeQuote24h.toFixed(2),
      m: ticker.markPrice.toString(),
      r: ticker.fundingRate.toString(),
    });

    this.broadcast(`${streamSymbol}@trade`, {
      e: 'trade',
      E: trade.timestamp,
      s: streamSymbol.toUpperCase(),
      t: trade.id,
      p: trade.price.toString(),
      q: trade.amount.toString(),
      b: trade.makerOrderId,
      a: trade.takerOrderId,
      T: trade.timestamp,
      m: trade.side === 'SELL',
    });
  }

  public subscribe(stream: string, callback: WSListener): () => void {
    if (!this.subscribers.has(stream)) {
      this.subscribers.set(stream, new Set());
    }
    this.subscribers.get(stream)!.add(callback);

    return () => {
      const set = this.subscribers.get(stream);
      if (set) {
        set.delete(callback);
      }
    };
  }

  public broadcast(stream: string, data: any) {
    if (this.isStreamPaused) return;

    // Check packet drop rate simulation
    if (this.packetDropRate > 0 && Math.random() * 100 < this.packetDropRate) {
      return; // Simulated packet dropped
    }

    const calculatedLatency = Math.max(2, this.streamLatencyMs + (Math.random() - 0.5) * this.simulatedJitterMs * 2);
    const msg: WSMessage = {
      id: `ws_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
      stream,
      timestamp: Date.now(),
      data,
      latencyMs: Math.round(calculatedLatency),
    };

    this.totalFramesSent++;
    this.totalBytesSent += JSON.stringify(msg).length;

    this.recentMessages.unshift(msg);
    if (this.recentMessages.length > 80) {
      this.recentMessages.pop();
    }

    const listeners = this.subscribers.get(stream);
    if (listeners) {
      listeners.forEach(cb => {
        try {
          cb(msg);
        } catch {
          // ignore
        }
      });
    }

    // Also notify wildcard listeners if any
    const wildcardListeners = this.subscribers.get('*');
    if (wildcardListeners) {
      wildcardListeners.forEach(cb => {
        try {
          cb(msg);
        } catch {
          // ignore
        }
      });
    }
  }

  public getRecentFrames(): WSMessage[] {
    return [...this.recentMessages];
  }
}
