import React, { useState } from 'react';
import { Order, Trade, Position, EngineMetrics } from '../types/crypto';
import { sound } from '../utils/sound';
import { Activity, XCircle, CheckCircle2, Cpu, ShieldAlert } from 'lucide-react';

interface OrdersAndPositionsProps {
  orders: Order[];
  triggerOrders: Order[];
  trades: Trade[];
  positions: Position[];
  engineMetrics: EngineMetrics;
  onCancelOrder: (orderId: string) => void;
  onClosePosition: (positionId: string) => void;
  priceDecimals: number;
}

export const OrdersAndPositions: React.FC<OrdersAndPositionsProps> = ({
  orders,
  triggerOrders,
  trades,
  positions,
  engineMetrics,
  onCancelOrder,
  onClosePosition,
  priceDecimals,
}) => {
  const [activeTab, setActiveTab] = useState<
    'open' | 'trigger' | 'positions' | 'orderHistory' | 'tradeHistory' | 'telemetry'
  >('open');

  const openOrders = orders.filter(o => o.status === 'OPEN' || o.status === 'PARTIALLY_FILLED');
  const pastOrders = orders.filter(o => o.status === 'FILLED' || o.status === 'CANCELED' || o.status === 'REJECTED');
  const userTrades = trades.filter(t => t.isUserTrade);

  const tabs = [
    { id: 'open', label: `Open Orders (${openOrders.length})` },
    { id: 'positions', label: `Positions (${positions.length})` },
    { id: 'trigger', label: `Trigger Orders (${triggerOrders.length})` },
    { id: 'orderHistory', label: 'Order History' },
    { id: 'tradeHistory', label: `Trade History (${userTrades.length})` },
    { id: 'telemetry', label: 'Engine Telemetry' },
  ];

  return (
    <div className="bg-[#0e121b] border border-[#1c2230] rounded flex flex-col h-full overflow-hidden select-none">
      {/* Tabs Bar */}
      <div className="flex items-center justify-between border-b border-[#1c2230] px-3 py-1 bg-[#0b0e14] text-xs">
        <div className="flex items-center gap-1 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded text-xs font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'bg-[#182030] text-cyan-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Engine status indicator */}
        <div className="hidden sm:flex items-center gap-2 text-[10px] text-slate-400 font-mono">
          <span className="flex items-center gap-1 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            LMAX FIFO Active
          </span>
          <span>·</span>
          <span>Avg: {engineMetrics.avgMatchingLatencyUs}µs</span>
        </div>
      </div>

      {/* Tab Contents */}
      <div className="flex-1 overflow-y-auto p-2 text-xs font-mono">
        {/* Open Orders Tab */}
        {activeTab === 'open' && (
          <div className="overflow-x-auto">
            {openOrders.length > 0 ? (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#1c2230] text-[10px] text-slate-400 uppercase">
                    <th className="py-1 px-2">Time</th>
                    <th className="py-1 px-2">Symbol</th>
                    <th className="py-1 px-2">Type</th>
                    <th className="py-1 px-2">Side</th>
                    <th className="py-1 px-2">Price</th>
                    <th className="py-1 px-2">Amount</th>
                    <th className="py-1 px-2">Filled</th>
                    <th className="py-1 px-2">TIF</th>
                    <th className="py-1 px-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#141b27]">
                  {openOrders.map(order => {
                    const fillPct = order.amount > 0 ? (order.filled / order.amount) * 100 : 0;
                    return (
                      <tr key={order.id} className="hover:bg-[#121722] transition-colors">
                        <td className="py-1.5 px-2 text-slate-400 text-[11px]">
                          {new Date(order.timestamp).toLocaleTimeString()}
                        </td>
                        <td className="py-1.5 px-2 font-bold text-slate-200">{order.symbol}</td>
                        <td className="py-1.5 px-2 text-slate-300">{order.type}</td>
                        <td className="py-1.5 px-2">
                          <span className={order.side === 'BUY' ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                            {order.side}
                          </span>
                        </td>
                        <td className="py-1.5 px-2 text-slate-200">{order.price.toFixed(priceDecimals)}</td>
                        <td className="py-1.5 px-2 text-slate-200">{order.amount.toFixed(4)}</td>
                        <td className="py-1.5 px-2">
                          <div className="flex items-center gap-1.5">
                            <span>{order.filled.toFixed(4)}</span>
                            <span className="text-[10px] text-slate-400">({fillPct.toFixed(0)}%)</span>
                          </div>
                        </td>
                        <td className="py-1.5 px-2 text-slate-400">{order.timeInForce}</td>
                        <td className="py-1.5 px-2 text-right">
                          <button
                            onClick={() => {
                              sound.playCancel();
                              onCancelOrder(order.id);
                            }}
                            className="px-2 py-0.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[10px] border border-rose-500/30 transition-colors"
                          >
                            Cancel
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="py-8 text-center text-slate-500 text-xs">
                No active open orders in book
              </div>
            )}
          </div>
        )}

        {/* Positions Tab */}
        {activeTab === 'positions' && (
          <div className="overflow-x-auto">
            {positions.length > 0 ? (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#1c2230] text-[10px] text-slate-400 uppercase">
                    <th className="py-1 px-2">Symbol</th>
                    <th className="py-1 px-2">Side</th>
                    <th className="py-1 px-2">Size</th>
                    <th className="py-1 px-2">Entry Price</th>
                    <th className="py-1 px-2">Mark Price</th>
                    <th className="py-1 px-2">Liq. Price</th>
                    <th className="py-1 px-2">Margin</th>
                    <th className="py-1 px-2">Unrealized PnL (ROE)</th>
                    <th className="py-1 px-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#141b27]">
                  {positions.map(pos => {
                    const isProfit = pos.unrealizedPnl >= 0;
                    return (
                      <tr key={pos.id} className="hover:bg-[#121722] transition-colors">
                        <td className="py-1.5 px-2 font-bold text-slate-200">
                          {pos.symbol} <span className="text-cyan-400 text-[10px]">{pos.leverage}x</span>
                        </td>
                        <td className="py-1.5 px-2">
                          <span className={pos.side === 'LONG' ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                            {pos.side}
                          </span>
                        </td>
                        <td className="py-1.5 px-2 text-slate-200">{pos.size.toFixed(4)}</td>
                        <td className="py-1.5 px-2 text-slate-300">{pos.entryPrice.toFixed(priceDecimals)}</td>
                        <td className="py-1.5 px-2 text-slate-300">{pos.markPrice.toFixed(priceDecimals)}</td>
                        <td className="py-1.5 px-2 text-amber-400">{pos.liquidationPrice.toFixed(priceDecimals)}</td>
                        <td className="py-1.5 px-2 text-slate-300">${pos.margin.toFixed(2)}</td>
                        <td className="py-1.5 px-2">
                          <span className={isProfit ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                            {isProfit ? '+' : ''}${pos.unrealizedPnl.toFixed(2)} ({isProfit ? '+' : ''}{pos.pnlPercentage.toFixed(2)}%)
                          </span>
                        </td>
                        <td className="py-1.5 px-2 text-right">
                          <button
                            onClick={() => onClosePosition(pos.id)}
                            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] border border-slate-700 transition-colors"
                          >
                            Market Close
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="py-8 text-center text-slate-500 text-xs">
                No open leveraged positions. Open a Perpetual Futures trade above.
              </div>
            )}
          </div>
        )}

        {/* Trigger Orders Tab */}
        {activeTab === 'trigger' && (
          <div className="overflow-x-auto">
            {triggerOrders.length > 0 ? (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#1c2230] text-[10px] text-slate-400 uppercase">
                    <th className="py-1 px-2">Symbol</th>
                    <th className="py-1 px-2">Type</th>
                    <th className="py-1 px-2">Side</th>
                    <th className="py-1 px-2">Trigger Condition</th>
                    <th className="py-1 px-2">Order Price</th>
                    <th className="py-1 px-2">Amount</th>
                    <th className="py-1 px-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#141b27]">
                  {triggerOrders.map(order => (
                    <tr key={order.id} className="hover:bg-[#121722] transition-colors">
                      <td className="py-1.5 px-2 font-bold text-slate-200">{order.symbol}</td>
                      <td className="py-1.5 px-2 text-slate-300">{order.type}</td>
                      <td className="py-1.5 px-2">
                        <span className={order.side === 'BUY' ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                          {order.side}
                        </span>
                      </td>
                      <td className="py-1.5 px-2 text-amber-400">
                        Mark Price {order.side === 'BUY' ? '≥' : '≤'} {order.stopPrice?.toFixed(priceDecimals)}
                      </td>
                      <td className="py-1.5 px-2 text-slate-300">{order.price.toFixed(priceDecimals)}</td>
                      <td className="py-1.5 px-2 text-slate-300">{order.amount.toFixed(4)}</td>
                      <td className="py-1.5 px-2 text-right">
                        <button
                          onClick={() => onCancelOrder(order.id)}
                          className="px-2 py-0.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[10px] border border-rose-500/30 transition-colors"
                        >
                          Cancel
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="py-8 text-center text-slate-500 text-xs">
                No pending Stop-Limit or Trigger orders
              </div>
            )}
          </div>
        )}

        {/* Order History */}
        {activeTab === 'orderHistory' && (
          <div className="overflow-x-auto">
            {pastOrders.length > 0 ? (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#1c2230] text-[10px] text-slate-400 uppercase">
                    <th className="py-1 px-2">Time</th>
                    <th className="py-1 px-2">Symbol</th>
                    <th className="py-1 px-2">Side</th>
                    <th className="py-1 px-2">Price</th>
                    <th className="py-1 px-2">Amount</th>
                    <th className="py-1 px-2">Executed</th>
                    <th className="py-1 px-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#141b27]">
                  {pastOrders.map(order => (
                    <tr key={order.id} className="hover:bg-[#121722] transition-colors">
                      <td className="py-1.5 px-2 text-slate-400 text-[11px]">
                        {new Date(order.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="py-1.5 px-2 font-bold text-slate-200">{order.symbol}</td>
                      <td className="py-1.5 px-2">
                        <span className={order.side === 'BUY' ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                          {order.side}
                        </span>
                      </td>
                      <td className="py-1.5 px-2 text-slate-300">{order.price.toFixed(priceDecimals)}</td>
                      <td className="py-1.5 px-2 text-slate-300">{order.amount.toFixed(4)}</td>
                      <td className="py-1.5 px-2 text-slate-300">{order.filled.toFixed(4)}</td>
                      <td className="py-1.5 px-2">
                        <span
                          className={`text-[10px] font-bold ${
                            order.status === 'FILLED'
                              ? 'text-emerald-400'
                              : order.status === 'CANCELED'
                              ? 'text-slate-400'
                              : 'text-rose-400'
                          }`}
                        >
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="py-8 text-center text-slate-500 text-xs">
                No past order history records yet
              </div>
            )}
          </div>
        )}

        {/* Trade History */}
        {activeTab === 'tradeHistory' && (
          <div className="overflow-x-auto">
            {userTrades.length > 0 ? (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#1c2230] text-[10px] text-slate-400 uppercase">
                    <th className="py-1 px-2">Time</th>
                    <th className="py-1 px-2">Trade ID</th>
                    <th className="py-1 px-2">Side</th>
                    <th className="py-1 px-2">Execution Price</th>
                    <th className="py-1 px-2">Amount</th>
                    <th className="py-1 px-2">Total Notional</th>
                    <th className="py-1 px-2">Fee Paid</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#141b27]">
                  {userTrades.map(tr => (
                    <tr key={tr.id} className="hover:bg-[#121722] transition-colors">
                      <td className="py-1.5 px-2 text-slate-400 text-[11px]">
                        {new Date(tr.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="py-1.5 px-2 text-slate-400 text-[10px]">{tr.id}</td>
                      <td className="py-1.5 px-2">
                        <span className={tr.side === 'BUY' ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                          {tr.side}
                        </span>
                      </td>
                      <td className="py-1.5 px-2 text-slate-200">{tr.price.toFixed(priceDecimals)}</td>
                      <td className="py-1.5 px-2 text-slate-200">{tr.amount.toFixed(4)}</td>
                      <td className="py-1.5 px-2 text-slate-200">${tr.cost.toFixed(2)}</td>
                      <td className="py-1.5 px-2 text-slate-400 text-[10px]">${tr.takerFee.toFixed(4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="py-8 text-center text-slate-500 text-xs">
                No user trades executed yet
              </div>
            )}
          </div>
        )}

        {/* Engine Telemetry Tab */}
        {activeTab === 'telemetry' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-2">
            <div className="bg-[#121722] p-3 rounded border border-[#1e2638]">
              <div className="text-[10px] text-slate-400 mb-1 flex items-center gap-1">
                <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                AVG MATCHING LATENCY
              </div>
              <div className="text-xl font-bold font-mono text-emerald-400">
                {engineMetrics.avgMatchingLatencyUs} µs
              </div>
              <div className="text-[10px] text-slate-500 mt-1">LMAX Disruptor FIFO ring buffer</div>
            </div>

            <div className="bg-[#121722] p-3 rounded border border-[#1e2638]">
              <div className="text-[10px] text-slate-400 mb-1 flex items-center gap-1">
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                THROUGHPUT OPS/SEC
              </div>
              <div className="text-xl font-bold font-mono text-slate-100">
                {engineMetrics.throughputPerSec.toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-500 mt-1">Peak tested: 650,000/sec</div>
            </div>

            <div className="bg-[#121722] p-3 rounded border border-[#1e2638]">
              <div className="text-[10px] text-slate-400 mb-1 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ORDERS PROCESSED
              </div>
              <div className="text-xl font-bold font-mono text-cyan-400">
                {engineMetrics.ordersProcessed.toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-500 mt-1">Total lifetime sequence ID</div>
            </div>

            <div className="bg-[#121722] p-3 rounded border border-[#1e2638]">
              <div className="text-[10px] text-slate-400 mb-1 flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 text-emerald-400" />
                RECONCILIATION STATE
              </div>
              <div className="text-xl font-bold font-mono text-emerald-400">
                {engineMetrics.systemStatus}
              </div>
              <div className="text-[10px] text-slate-500 mt-1">Continuous double-entry verification</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
