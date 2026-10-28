import React, { useState } from 'react';
import { MatchingEngine } from '../engine/MatchingEngine';
import { MarketDataService } from '../services/MarketDataService';
import { LedgerService } from '../engine/LedgerService';
import { Terminal, Send, Copy, Check, Code, Play } from 'lucide-react';

interface ApiConsoleProps {
  engine: MatchingEngine;
  marketDataService: MarketDataService;
  ledgerService: LedgerService;
  currentSymbol: string;
}

export const ApiConsole: React.FC<ApiConsoleProps> = ({
  engine,
  marketDataService,
  ledgerService,
  currentSymbol,
}) => {
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>('depth');
  const [requestMethod, setRequestMethod] = useState<'GET' | 'POST' | 'DELETE'>('GET');
  const [requestPath, setRequestPath] = useState<string>('/api/v1/depth?symbol=BTCUSDT&limit=10');
  const [requestBody, setRequestBody] = useState<string>(
    JSON.stringify(
      {
        symbol: 'BTCUSDT',
        side: 'BUY',
        type: 'LIMIT',
        timeInForce: 'GTC',
        quantity: 0.1,
        price: 68400.0,
      },
      null,
      2
    )
  );

  const [responseStatus, setResponseStatus] = useState<number | null>(null);
  const [responseHeaders, setResponseHeaders] = useState<Record<string, string>>({});
  const [responseBody, setResponseBody] = useState<any>(null);
  const [responseLatencyUs, setResponseLatencyUs] = useState<number>(0);
  const [copied, setCopied] = useState(false);

  const cleanSymbol = currentSymbol.replace('/', '');

  const endpoints = [
    {
      id: 'ticker',
      name: '24hr Ticker Price Statistics',
      method: 'GET' as const,
      path: `/api/v1/ticker/24hr?symbol=${cleanSymbol}`,
      body: '',
    },
    {
      id: 'depth',
      name: 'Order Book Depth (L2)',
      method: 'GET' as const,
      path: `/api/v1/depth?symbol=${cleanSymbol}&limit=10`,
      body: '',
    },
    {
      id: 'trades',
      name: 'Recent Public Trades',
      method: 'GET' as const,
      path: `/api/v1/trades?symbol=${cleanSymbol}&limit=20`,
      body: '',
    },
    {
      id: 'order_create',
      name: 'Place New Order (Signed)',
      method: 'POST' as const,
      path: `/api/v1/order`,
      body: JSON.stringify(
        {
          symbol: cleanSymbol,
          side: 'BUY',
          type: 'LIMIT',
          timeInForce: 'GTC',
          quantity: 0.05,
          price: Number((marketDataService.getTicker(currentSymbol).price * 0.999).toFixed(2)),
          recvWindow: 5000,
        },
        null,
        2
      ),
    },
    {
      id: 'account',
      name: 'Account Portfolio & Ledger (Signed)',
      method: 'GET' as const,
      path: `/api/v1/account`,
      body: '',
    },
  ];

  const handleSelectEndpoint = (ep: typeof endpoints[0]) => {
    setSelectedEndpoint(ep.id);
    setRequestMethod(ep.method);
    setRequestPath(ep.path);
    if (ep.body) setRequestBody(ep.body);
  };

  const handleExecuteRequest = () => {
    const start = performance.now();
    const timestamp = Date.now();
    const headers: Record<string, string> = {
      'content-type': 'application/json; charset=utf-8',
      'x-mbx-used-weight': '1',
      'x-mbx-used-weight-1m': '14',
      'x-server-execution-time': '12µs',
      'access-control-allow-origin': '*',
    };

    let resultData: any = {};

    try {
      if (selectedEndpoint === 'ticker') {
        const t = marketDataService.getTicker(currentSymbol);
        resultData = {
          symbol: cleanSymbol,
          priceChange: t.change24h.toString(),
          priceChangePercent: `${t.change24h}%`,
          weightedAvgPrice: t.markPrice.toString(),
          prevClosePrice: t.prevPrice.toString(),
          lastPrice: t.price.toString(),
          bidPrice: (engine.getBestBid() || t.price).toString(),
          askPrice: (engine.getBestAsk() || t.price).toString(),
          openPrice: (t.price * (1 - t.change24h / 100)).toFixed(2),
          highPrice: t.high24h.toString(),
          lowPrice: t.low24h.toString(),
          volume: t.volume24h.toFixed(4),
          quoteVolume: t.volumeQuote24h.toFixed(2),
          openTime: timestamp - 86400000,
          closeTime: timestamp,
          count: engine.processedCount,
        };
      } else if (selectedEndpoint === 'depth') {
        const depth = engine.getDepth(10);
        resultData = {
          lastUpdateId: timestamp,
          bids: depth.bids.map(b => [b.price.toFixed(2), b.amount.toFixed(4)]),
          asks: depth.asks.map(a => [a.price.toFixed(2), a.amount.toFixed(4)]),
        };
      } else if (selectedEndpoint === 'trades') {
        resultData = [
          {
            id: 28459102,
            price: (marketDataService.getTicker(currentSymbol).price).toFixed(2),
            qty: "0.1420",
            quoteQty: "9719.90",
            time: timestamp - 1200,
            isBuyerMaker: false,
            isBestMatch: true
          },
          {
            id: 28459101,
            price: (marketDataService.getTicker(currentSymbol).price - 0.5).toFixed(2),
            qty: "0.4500",
            quoteQty: "30793.50",
            time: timestamp - 2400,
            isBuyerMaker: true,
            isBestMatch: true
          }
        ];
      } else if (selectedEndpoint === 'order_create') {
        const parsed = JSON.parse(requestBody);
        const orderId = `api_ord_${Date.now()}`;
        resultData = {
          symbol: parsed.symbol,
          orderId: Math.floor(Math.random() * 100000000),
          orderListId: -1,
          clientOrderId: orderId,
          transactTime: timestamp,
          price: parsed.price.toString(),
          origQty: parsed.quantity.toString(),
          executedQty: '0.00000000',
          cummulativeQuoteQty: '0.00000000',
          status: 'NEW',
          timeInForce: parsed.timeInForce || 'GTC',
          type: parsed.type || 'LIMIT',
          side: parsed.side || 'BUY',
          workingTime: timestamp,
          selfTradePreventionMode: 'CANCEL_MAKER',
        };
      } else if (selectedEndpoint === 'account') {
        const usdtAvail = ledgerService.getBalance('USER:SPOT:AVAILABLE:USDT');
        const btcAvail = ledgerService.getBalance('USER:SPOT:AVAILABLE:BTC');
        resultData = {
          makerCommission: 2, // 0.02%
          takerCommission: 5, // 0.05%
          buyerCommission: 0,
          sellerCommission: 0,
          canTrade: true,
          canWithdraw: true,
          canDeposit: true,
          brokered: false,
          requireSelfTradePrevention: true,
          updateTime: timestamp,
          accountType: 'SPOT',
          balances: [
            { asset: 'USDT', free: usdtAvail.toFixed(8), locked: '0.00000000' },
            { asset: 'BTC', free: btcAvail.toFixed(8), locked: '0.00000000' },
            { asset: 'ETH', free: '8.50000000', locked: '0.00000000' },
            { asset: 'SOL', free: '45.00000000', locked: '0.00000000' },
          ],
        };
      }

      const elapsedUs = Math.max(28, Math.round((performance.now() - start) * 1000));
      headers['x-match-latency-us'] = `${elapsedUs}µs`;

      setResponseStatus(200);
      setResponseHeaders(headers);
      setResponseBody(resultData);
      setResponseLatencyUs(elapsedUs);
    } catch (err: any) {
      setResponseStatus(400);
      setResponseBody({ code: -1100, msg: err.message || 'Illegal characters found in parameter' });
    }
  };

  const copyCurl = () => {
    const curl = `curl -X ${requestMethod} "https://api.apextrade.pro${requestPath}" \\
  -H "X-MBX-APIKEY: ak_live_79a0f81b2c4e8d910293481029" \\
  -H "Content-Type: application/json"${requestMethod === 'POST' ? ` \\\n  -d '${requestBody.replace(/\n/g, '')}'` : ''}`;

    navigator.clipboard.writeText(curl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex-1 bg-[#0b0e14] p-4 flex flex-col overflow-y-auto space-y-4 font-mono text-xs">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between border-b border-[#1c2230] pb-4 gap-4">
        <div>
          <h1 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Terminal className="w-5 h-5 text-cyan-400" />
            Institutional REST & FIX API Sandbox
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Low-Latency Binance-Compatible REST Endpoints · HMAC-SHA256 Signatures · Microsecond Engine Timing
          </p>
        </div>

        <button
          onClick={copyCurl}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#121722] hover:bg-[#182030] text-cyan-400 border border-[#1e2638] transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Code className="w-3.5 h-3.5" />}
          <span>{copied ? 'cURL Copied' : 'Copy as cURL'}</span>
        </button>
      </div>

      {/* Main Sandbox Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Endpoint Selector & Request Config */}
        <div className="lg:col-span-5 bg-[#0e121b] border border-[#1c2230] p-4 rounded space-y-4 flex flex-col">
          <div className="text-xs font-bold text-slate-200 uppercase">Available Endpoints</div>

          {/* Endpoint list */}
          <div className="space-y-1.5">
            {endpoints.map(ep => (
              <div
                key={ep.id}
                onClick={() => handleSelectEndpoint(ep)}
                className={`p-2.5 rounded border cursor-pointer transition-all ${
                  selectedEndpoint === ep.id
                    ? 'bg-[#182030] border-cyan-500/50 text-slate-100'
                    : 'bg-[#121722] border-[#1e2638] text-slate-400 hover:text-slate-200 hover:border-[#2e3b56]'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      ep.method === 'POST'
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    }`}
                  >
                    {ep.method}
                  </span>
                  <span className="font-bold text-slate-200">{ep.name}</span>
                </div>
                <div className="text-[10px] text-slate-500 truncate">{ep.path}</div>
              </div>
            ))}
          </div>

          {/* Request URL Input & Send */}
          <div className="pt-2 space-y-2">
            <div className="text-[11px] text-slate-400">Request Target:</div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1.5 rounded bg-[#121722] text-cyan-400 border border-[#1e2638] font-bold text-[11px]">
                {requestMethod}
              </span>
              <input
                type="text"
                value={requestPath}
                onChange={(e) => setRequestPath(e.target.value)}
                className="flex-1 bg-[#121722] border border-[#1e2638] rounded px-3 py-1.5 text-xs text-slate-100 outline-none focus:border-cyan-500"
              />
              <button
                onClick={handleExecuteRequest}
                className="px-4 py-1.5 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold uppercase transition-all shadow-md flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Send</span>
              </button>
            </div>
          </div>

          {/* JSON Body (for POST) */}
          {requestMethod === 'POST' && (
            <div className="space-y-1">
              <div className="text-[11px] text-slate-400">JSON Request Payload:</div>
              <textarea
                value={requestBody}
                onChange={(e) => setRequestBody(e.target.value)}
                rows={7}
                className="w-full bg-[#121722] border border-[#1e2638] rounded p-2.5 text-slate-200 text-xs outline-none focus:border-cyan-500 font-mono"
              />
            </div>
          )}
        </div>

        {/* Right: Response Inspector */}
        <div className="lg:col-span-7 bg-[#0e121b] border border-[#1c2230] p-4 rounded space-y-3 flex flex-col">
          <div className="flex items-center justify-between border-b border-[#1c2230] pb-2">
            <div className="text-xs font-bold text-slate-200 uppercase">Live Response Inspector</div>
            {responseStatus && (
              <div className="flex items-center gap-3 text-[11px]">
                <span className="text-slate-400">Execution Latency: <span className="text-emerald-400 font-bold">{responseLatencyUs} µs</span></span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/30">
                  {responseStatus} OK
                </span>
              </div>
            )}
          </div>

          {/* Response Headers */}
          {Object.keys(responseHeaders).length > 0 && (
            <div className="p-2.5 bg-[#121722] border border-[#1e2638] rounded text-[10px] space-y-1">
              <div className="text-slate-500 uppercase font-bold mb-1">Response Headers:</div>
              {Object.entries(responseHeaders).map(([k, v]) => (
                <div key={k} className="flex justify-between text-slate-400">
                  <span className="text-slate-500">{k}:</span>
                  <span className="text-cyan-400 font-mono">{v}</span>
                </div>
              ))}
            </div>
          )}

          {/* Response JSON Body */}
          <div className="flex-1 flex flex-col space-y-1">
            <div className="text-[10px] text-slate-500 uppercase font-bold">Response Body:</div>
            <pre className="flex-1 p-3 rounded bg-[#0b0e14] border border-[#182030] text-slate-200 text-xs overflow-auto max-h-[380px]">
              {responseBody ? JSON.stringify(responseBody, null, 2) : '// Click "Send" above to dispatch API call'}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
