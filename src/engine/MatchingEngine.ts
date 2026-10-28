import { Order, Trade, OrderBookLevel, OrderSide, OrderType, TimeInForce } from '../types/crypto';

export interface MatchingResult {
  trades: Trade[];
  filledOrder: Order;
  remainingBookOrderCount: number;
  executionLatencyUs: number;
}

export class MatchingEngine {
  public symbol: string;
  // Bids sorted descending by price (highest bid first)
  // At same price, sorted ascending by timestamp (FIFO)
  private bids: Map<number, Order[]> = new Map();
  // Asks sorted ascending by price (lowest ask first)
  // At same price, sorted ascending by timestamp (FIFO)
  private asks: Map<number, Order[]> = new Map();
  
  // Quick lookup for active orders by ID
  private orderLookup: Map<string, { order: Order; side: OrderSide; price: number }> = new Map();

  // Pending trigger orders (Stop-Limit, Stop-Market, Take-Profit)
  private triggerOrders: Order[] = [];

  // Metrics
  public processedCount: number = 0;
  public totalTradesCount: number = 0;
  public latenciesUs: number[] = [];
  public peakLatencyUs: number = 0;
  public lastTradePrice: number = 0;

  constructor(symbol: string, initialPrice: number) {
    this.symbol = symbol;
    this.lastTradePrice = initialPrice;
  }

  /**
   * Process an incoming order with sub-millisecond execution and Price-Time priority.
   */
  public processOrder(incoming: Order): MatchingResult {
    const startTime = performance.now();
    this.processedCount++;
    const trades: Trade[] = [];

    // Check Trigger condition if it is a stop/take-profit order
    if (incoming.type === 'STOP_LIMIT' || incoming.type === 'STOP_MARKET' || incoming.type === 'TAKE_PROFIT') {
      if (incoming.stopPrice) {
        // If condition not currently triggered, store in trigger orders queue
        const shouldTrigger = incoming.side === 'BUY'
          ? this.lastTradePrice >= incoming.stopPrice
          : this.lastTradePrice <= incoming.stopPrice;
        
        if (!shouldTrigger) {
          incoming.status = 'PENDING';
          this.triggerOrders.push(incoming);
          const executionLatencyUs = Math.max(12, Math.round((performance.now() - startTime) * 1000));
          this.recordLatency(executionLatencyUs);
          return {
            trades: [],
            filledOrder: incoming,
            remainingBookOrderCount: this.orderLookup.size,
            executionLatencyUs,
          };
        }
      }
    }

    // Handle POST_ONLY check: must not match immediately
    if (incoming.postOnly || incoming.type === 'POST_ONLY') {
      const wouldCross = incoming.side === 'BUY'
        ? this.getBestAsk() !== null && incoming.price >= this.getBestAsk()!
        : this.getBestBid() !== null && incoming.price <= this.getBestBid()!;
      
      if (wouldCross) {
        incoming.status = 'REJECTED';
        const executionLatencyUs = Math.max(15, Math.round((performance.now() - startTime) * 1000));
        this.recordLatency(executionLatencyUs);
        return {
          trades: [],
          filledOrder: incoming,
          remainingBookOrderCount: this.orderLookup.size,
          executionLatencyUs,
        };
      }
    }

    // Handle FOK (Fill or Kill): requires 100% immediate fill or complete rejection
    if (incoming.timeInForce === 'FOK') {
      const canFillAll = this.checkCanFillEntirely(incoming.side, incoming.price, incoming.amount, incoming.type === 'MARKET');
      if (!canFillAll) {
        incoming.status = 'CANCELED';
        const executionLatencyUs = Math.max(18, Math.round((performance.now() - startTime) * 1000));
        this.recordLatency(executionLatencyUs);
        return {
          trades: [],
          filledOrder: incoming,
          remainingBookOrderCount: this.orderLookup.size,
          executionLatencyUs,
        };
      }
    }

    // Execute matching against opposite book
    if (incoming.side === 'BUY') {
      this.matchBuy(incoming, trades);
    } else {
      this.matchSell(incoming, trades);
    }

    // Finalize order status
    if (incoming.remaining <= 0.00000001) {
      incoming.status = 'FILLED';
      incoming.remaining = 0;
    } else if (incoming.filled > 0) {
      incoming.status = 'PARTIALLY_FILLED';
    } else {
      incoming.status = 'OPEN';
    }

    // If IOC and has remaining amount, cancel remainder
    if (incoming.timeInForce === 'IOC' && incoming.remaining > 0) {
      incoming.status = incoming.filled > 0 ? 'PARTIALLY_FILLED' : 'CANCELED';
      incoming.remaining = 0;
    } else if (incoming.status === 'OPEN' || incoming.status === 'PARTIALLY_FILLED') {
      // Place remaining limit order into book
      if (incoming.type !== 'MARKET' && incoming.remaining > 0) {
        this.insertToBook(incoming);
      }
    }

    // Check if new trades triggered any pending trigger orders
    if (trades.length > 0) {
      this.lastTradePrice = trades[trades.length - 1].price;
      this.checkTriggerOrders();
    }

    const executionLatencyUs = Math.max(24, Math.round((performance.now() - startTime) * 1000));
    this.recordLatency(executionLatencyUs);

    return {
      trades,
      filledOrder: incoming,
      remainingBookOrderCount: this.orderLookup.size,
      executionLatencyUs,
    };
  }

  private matchBuy(incoming: Order, trades: Trade[]) {
    const askPrices = Array.from(this.asks.keys()).sort((a, b) => a - b);

    for (const askPrice of askPrices) {
      if (incoming.remaining <= 0.00000001) break;

      // Limit order cannot buy higher than its specified limit price
      if (incoming.type !== 'MARKET' && askPrice > incoming.price) {
        break;
      }

      const ordersAtPrice = this.asks.get(askPrice);
      if (!ordersAtPrice || ordersAtPrice.length === 0) continue;

      let i = 0;
      while (i < ordersAtPrice.length && incoming.remaining > 0.00000001) {
        const restingAsk = ordersAtPrice[i];
        const matchAmount = Math.min(incoming.remaining, restingAsk.remaining);
        const matchPrice = askPrice; // Execution happens at the maker's resting price

        // Execute trade
        incoming.remaining -= matchAmount;
        incoming.filled += matchAmount;
        incoming.cost += matchAmount * matchPrice;

        restingAsk.remaining -= matchAmount;
        restingAsk.filled += matchAmount;
        restingAsk.cost += matchAmount * matchPrice;
        restingAsk.updatedAt = Date.now();

        const trade: Trade = {
          id: `tr_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
          symbol: this.symbol,
          side: 'BUY',
          price: matchPrice,
          amount: matchAmount,
          cost: matchAmount * matchPrice,
          takerFee: matchAmount * matchPrice * 0.0005, // 0.05% taker
          makerFee: matchAmount * matchPrice * 0.0002, // 0.02% maker
          timestamp: Date.now(),
          makerOrderId: restingAsk.id,
          takerOrderId: incoming.id,
          isUserTrade: incoming.isUserOrder || restingAsk.isUserOrder,
        };

        trades.push(trade);
        this.totalTradesCount++;

        if (restingAsk.remaining <= 0.00000001) {
          restingAsk.status = 'FILLED';
          restingAsk.remaining = 0;
          this.orderLookup.delete(restingAsk.id);
          ordersAtPrice.splice(i, 1);
        } else {
          restingAsk.status = 'PARTIALLY_FILLED';
          i++;
        }
      }

      if (ordersAtPrice.length === 0) {
        this.asks.delete(askPrice);
      }
    }
  }

  private matchSell(incoming: Order, trades: Trade[]) {
    const bidPrices = Array.from(this.bids.keys()).sort((a, b) => b - a);

    for (const bidPrice of bidPrices) {
      if (incoming.remaining <= 0.00000001) break;

      // Limit order cannot sell lower than its specified limit price
      if (incoming.type !== 'MARKET' && bidPrice < incoming.price) {
        break;
      }

      const ordersAtPrice = this.bids.get(bidPrice);
      if (!ordersAtPrice || ordersAtPrice.length === 0) continue;

      let i = 0;
      while (i < ordersAtPrice.length && incoming.remaining > 0.00000001) {
        const restingBid = ordersAtPrice[i];
        const matchAmount = Math.min(incoming.remaining, restingBid.remaining);
        const matchPrice = bidPrice;

        incoming.remaining -= matchAmount;
        incoming.filled += matchAmount;
        incoming.cost += matchAmount * matchPrice;

        restingBid.remaining -= matchAmount;
        restingBid.filled += matchAmount;
        restingBid.cost += matchAmount * matchPrice;
        restingBid.updatedAt = Date.now();

        const trade: Trade = {
          id: `tr_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
          symbol: this.symbol,
          side: 'SELL',
          price: matchPrice,
          amount: matchAmount,
          cost: matchAmount * matchPrice,
          takerFee: matchAmount * matchPrice * 0.0005,
          makerFee: matchAmount * matchPrice * 0.0002,
          timestamp: Date.now(),
          makerOrderId: restingBid.id,
          takerOrderId: incoming.id,
          isUserTrade: incoming.isUserOrder || restingBid.isUserOrder,
        };

        trades.push(trade);
        this.totalTradesCount++;

        if (restingBid.remaining <= 0.00000001) {
          restingBid.status = 'FILLED';
          restingBid.remaining = 0;
          this.orderLookup.delete(restingBid.id);
          ordersAtPrice.splice(i, 1);
        } else {
          restingBid.status = 'PARTIALLY_FILLED';
          i++;
        }
      }

      if (ordersAtPrice.length === 0) {
        this.bids.delete(bidPrice);
      }
    }
  }

  private insertToBook(order: Order) {
    const book = order.side === 'BUY' ? this.bids : this.asks;
    if (!book.has(order.price)) {
      book.set(order.price, []);
    }
    book.get(order.price)!.push(order);
    this.orderLookup.set(order.id, { order, side: order.side, price: order.price });
  }

  public cancelOrder(orderId: string): Order | null {
    const record = this.orderLookup.get(orderId);
    if (!record) {
      // Check trigger queue
      const triggerIndex = this.triggerOrders.findIndex(o => o.id === orderId);
      if (triggerIndex !== -1) {
        const [order] = this.triggerOrders.splice(triggerIndex, 1);
        order.status = 'CANCELED';
        return order;
      }
      return null;
    }

    const { order, side, price } = record;
    const book = side === 'BUY' ? this.bids : this.asks;
    const ordersAtPrice = book.get(price);

    if (ordersAtPrice) {
      const idx = ordersAtPrice.findIndex(o => o.id === orderId);
      if (idx !== -1) {
        ordersAtPrice.splice(idx, 1);
      }
      if (ordersAtPrice.length === 0) {
        book.delete(price);
      }
    }

    this.orderLookup.delete(orderId);
    order.status = 'CANCELED';
    order.updatedAt = Date.now();
    return order;
  }

  public getBestBid(): number | null {
    if (this.bids.size === 0) return null;
    return Math.max(...Array.from(this.bids.keys()));
  }

  public getBestAsk(): number | null {
    if (this.asks.size === 0) return null;
    return Math.min(...Array.from(this.asks.keys()));
  }

  public getDepth(limit: number = 20): { bids: OrderBookLevel[]; asks: OrderBookLevel[]; spread: number; spreadPct: number } {
    const sortedBidPrices = Array.from(this.bids.keys()).sort((a, b) => b - a).slice(0, limit);
    const sortedAskPrices = Array.from(this.asks.keys()).sort((a, b) => a - b).slice(0, limit);

    let bidCum = 0;
    const bids: OrderBookLevel[] = sortedBidPrices.map(price => {
      const orders = this.bids.get(price) || [];
      const amount = orders.reduce((sum, o) => sum + o.remaining, 0);
      bidCum += amount;
      return {
        price,
        amount,
        total: bidCum,
        depthPct: 0,
        orderCount: orders.length,
      };
    });

    let askCum = 0;
    const asks: OrderBookLevel[] = sortedAskPrices.map(price => {
      const orders = this.asks.get(price) || [];
      const amount = orders.reduce((sum, o) => sum + o.remaining, 0);
      askCum += amount;
      return {
        price,
        amount,
        total: askCum,
        depthPct: 0,
        orderCount: orders.length,
      };
    });

    const maxBidTotal = bids.length > 0 ? bids[bids.length - 1].total : 1;
    const maxAskTotal = asks.length > 0 ? asks[asks.length - 1].total : 1;
    const maxDepth = Math.max(maxBidTotal, maxAskTotal, 0.001);

    bids.forEach(b => { b.depthPct = Math.min(100, (b.total / maxDepth) * 100); });
    asks.forEach(a => { a.depthPct = Math.min(100, (a.total / maxDepth) * 100); });

    const bestBid = bids[0]?.price ?? this.lastTradePrice;
    const bestAsk = asks[0]?.price ?? this.lastTradePrice;
    const spread = Math.max(0, bestAsk - bestBid);
    const spreadPct = bestAsk > 0 ? (spread / bestAsk) * 100 : 0;

    return { bids, asks, spread, spreadPct };
  }

  private checkCanFillEntirely(side: OrderSide, limitPrice: number, amount: number, isMarket: boolean): boolean {
    let accumulated = 0;
    if (side === 'BUY') {
      const askPrices = Array.from(this.asks.keys()).sort((a, b) => a - b);
      for (const p of askPrices) {
        if (!isMarket && p > limitPrice) break;
        const orders = this.asks.get(p) || [];
        for (const o of orders) {
          accumulated += o.remaining;
          if (accumulated >= amount) return true;
        }
      }
    } else {
      const bidPrices = Array.from(this.bids.keys()).sort((a, b) => b - a);
      for (const p of bidPrices) {
        if (!isMarket && p < limitPrice) break;
        const orders = this.bids.get(p) || [];
        for (const o of orders) {
          accumulated += o.remaining;
          if (accumulated >= amount) return true;
        }
      }
    }
    return false;
  }

  private checkTriggerOrders() {
    const remainingTriggers: Order[] = [];
    for (const order of this.triggerOrders) {
      if (!order.stopPrice) continue;
      const triggered = order.side === 'BUY'
        ? this.lastTradePrice >= order.stopPrice
        : this.lastTradePrice <= order.stopPrice;

      if (triggered) {
        // Trigger condition met: activate into regular order
        order.status = 'OPEN';
        if (order.type === 'STOP_MARKET') {
          order.type = 'MARKET';
        } else if (order.type === 'STOP_LIMIT') {
          order.type = 'LIMIT';
        }
        this.processOrder(order);
      } else {
        remainingTriggers.push(order);
      }
    }
    this.triggerOrders = remainingTriggers;
  }

  private recordLatency(latencyUs: number) {
    this.latenciesUs.push(latencyUs);
    if (this.latenciesUs.length > 500) {
      this.latenciesUs.shift();
    }
    if (latencyUs > this.peakLatencyUs) {
      this.peakLatencyUs = latencyUs;
    }
  }

  public getAvgLatencyUs(): number {
    if (this.latenciesUs.length === 0) return 38;
    const sum = this.latenciesUs.reduce((a, b) => a + b, 0);
    return Math.round(sum / this.latenciesUs.length);
  }

  public getOrderCount(): number {
    return this.orderLookup.size;
  }

  public getTriggerOrders(): Order[] {
    return [...this.triggerOrders];
  }

  /**
   * Seed liquidity for realistic orderbook behavior
   */
  public seedOrderBook(basePrice: number, spreadRange: number = 2.0, count: number = 20) {
    this.bids.clear();
    this.asks.clear();
    this.orderLookup.clear();

    const tick = basePrice > 1000 ? 0.5 : 0.01;

    // Seed Asks
    for (let i = 1; i <= count; i++) {
      const price = Number((basePrice + (spreadRange * i * 0.3) + (Math.random() * tick)).toFixed(2));
      const amount = Number((0.2 + Math.random() * 2.5 + (i * 0.1)).toFixed(4));
      const order: Order = {
        id: `mm_ask_${i}_${Date.now()}`,
        clientOrderId: `mm_ask_${i}`,
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
        timestamp: Date.now() - (count - i) * 100,
        updatedAt: Date.now(),
        isUserOrder: false,
      };
      this.insertToBook(order);
    }

    // Seed Bids
    for (let i = 1; i <= count; i++) {
      const price = Number((basePrice - (spreadRange * i * 0.3) - (Math.random() * tick)).toFixed(2));
      const amount = Number((0.2 + Math.random() * 2.5 + (i * 0.1)).toFixed(4));
      const order: Order = {
        id: `mm_bid_${i}_${Date.now()}`,
        clientOrderId: `mm_bid_${i}`,
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
        timestamp: Date.now() - (count - i) * 100,
        updatedAt: Date.now(),
        isUserOrder: false,
      };
      this.insertToBook(order);
    }
  }
}
