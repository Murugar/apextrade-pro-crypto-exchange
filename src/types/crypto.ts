export type OrderSide = 'BUY' | 'SELL';

export type OrderType =
  | 'LIMIT'
  | 'MARKET'
  | 'STOP_LIMIT'
  | 'STOP_MARKET'
  | 'TAKE_PROFIT'
  | 'TRAILING_STOP'
  | 'POST_ONLY';

export type TimeInForce = 'GTC' | 'IOC' | 'FOK';

export type OrderStatus =
  | 'PENDING'
  | 'OPEN'
  | 'PARTIALLY_FILLED'
  | 'FILLED'
  | 'CANCELED'
  | 'REJECTED'
  | 'EXPIRED';

export interface Order {
  id: string;
  clientOrderId: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  timeInForce: TimeInForce;
  price: number;
  stopPrice?: number;
  trailingDelta?: number;
  amount: number;
  filled: number;
  remaining: number;
  cost: number;
  fee: number;
  status: OrderStatus;
  postOnly?: boolean;
  reduceOnly?: boolean;
  timestamp: number;
  updatedAt: number;
  isUserOrder: boolean;
}

export interface Trade {
  id: string;
  symbol: string;
  side: OrderSide;
  price: number;
  amount: number;
  cost: number;
  takerFee: number;
  makerFee: number;
  timestamp: number;
  makerOrderId: string;
  takerOrderId: string;
  isUserTrade?: boolean;
}

export interface Position {
  id: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  size: number;
  entryPrice: number;
  markPrice: number;
  leverage: number;
  margin: number;
  liquidationPrice: number;
  unrealizedPnl: number;
  pnlPercentage: number;
  tpPrice?: number;
  slPrice?: number;
  timestamp: number;
}

export type LedgerEntryType =
  | 'DEPOSIT'
  | 'WITHDRAWAL'
  | 'ORDER_LOCK'
  | 'ORDER_UNLOCK'
  | 'TRADE_EXEC'
  | 'FEE_PAYMENT'
  | 'FUNDING_SETTLEMENT';

export interface LedgerEntry {
  id: string;
  timestamp: number;
  type: LedgerEntryType;
  asset: string;
  accountFrom: string;
  accountTo: string;
  amount: number;
  balanceAfter: number;
  entryHash: string;
  referenceId: string;
  note: string;
}

export type BlockchainType = 'Bitcoin' | 'Ethereum' | 'Solana' | 'Arbitrum' | 'Tron';

export interface BlockchainTx {
  id: string;
  hash: string;
  chain: BlockchainType;
  asset: string;
  type: 'DEPOSIT' | 'WITHDRAW';
  amount: number;
  networkFee: number;
  fromAddress: string;
  toAddress: string;
  confirmations: number;
  requiredConfirmations: number;
  status: 'DETECTED' | 'CONFIRMING' | 'CONFIRMED' | 'REJECTED';
  blockHeight: number;
  timestamp: number;
  explorerUrl: string;
}

export interface MarketTicker {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  price: number;
  prevPrice: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  volumeQuote24h: number;
  markPrice: number;
  indexPrice: number;
  fundingRate: number;
  nextFundingTimestamp: number;
  priceDecimals: number;
  sizeDecimals: number;
  minOrderSize: number;
  tickSize: number;
}

export interface OrderBookLevel {
  price: number;
  amount: number;
  total: number;
  depthPct: number;
  orderCount: number;
}

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface EngineMetrics {
  ordersProcessed: number;
  tradesMatched: number;
  avgMatchingLatencyUs: number;
  peakLatencyUs: number;
  queueDepth: number;
  throughputPerSec: number;
  activeMemoryKb: number;
  systemStatus: 'ONLINE' | 'DEGRADED' | 'RECONCILING';
}

export interface UserBalance {
  asset: string;
  available: number;
  locked: number;
  total: number;
  usdValue: number;
}

export interface VaultReserve {
  asset: string;
  chain: BlockchainType;
  hotReserve: number;
  coldReserve: number;
  totalReserve: number;
  hotTargetPct: number;
  coldMultiSigRequired: string;
  coldAddress: string;
  lastAudited: number;
}
