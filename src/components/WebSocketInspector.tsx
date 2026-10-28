import React, { useState, useEffect } from 'react';
import { MarketDataService, WSMessage } from '../services/MarketDataService';
import { Radio, Play, Pause, Trash2, Copy, Check, Sliders, Activity, Terminal } from 'lucide-react';

interface WebSocketInspectorProps {
  marketDataService: MarketDataService;
  currentSymbol: string;
}

export const WebSocketInspector: React.FC<WebSocketInspectorProps> = ({
  marketDataService,
  currentSymbol,
}) => {
  const [messages, setMessages] = useState<WSMessage[]>([]);
  const [isPaused, setIsPaused] = useState(marketDataService.isStreamPaused);
  const [latency, setLatency] = useState(marketDataService.streamLatencyMs);
  const [packetDrop, setPacketDrop] = useState(marketDataService.packetDropRate);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const cleanSymbol = currentSymbol.replace('/', '').toLowerCase();

  useEffect(() => {
    // Subscribe to all stream frames
    const unsubscribe = marketDataService.subscribe('*', (msg) => {
      setMessages(prev => [msg, ...prev.slice(0, 70)]);
    });

    return () => {
      unsubscribe();
    };
  }, [marketDataService]);

  const togglePause = () => {
    marketDataService.isStreamPaused = !isPaused;
    setIsPaused(!isPaused);
  };

  const handleLatencyChange = (val: number) => {
    setLatency(val);
    marketDataService.streamLatencyMs = val;
  };

  const handlePacketDropChange = (val: number) => {
    setPacketDrop(val);
    marketDataService.packetDropRate = val;
  };

  const handleCopyMessage = (msg: WSMessage) => {
    navigator.clipboard.writeText(JSON.stringify(msg.data, null, 2));
    setCopiedId(msg.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const filteredMessages = messages.filter(m => {
    if (activeFilter === 'all') return true;
    return m.stream.includes(activeFilter);
  });

  return (
    <div className="flex-1 bg-[#0b0e14] p-4 flex flex-col overflow-y-auto space-y-4">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between border-b border-[#1c2230] pb-4 gap-4">
        <div>
          <h1 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Radio className="w-5 h-5 text-cyan-400" />
            Market Data & WebSocket Stream Multiplexer
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Non-Blocking Epoll Fan-Out · Sub-10ms Client Delivery · Real-Time Binary/JSON Pub/Sub Frames
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={togglePause}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-colors ${
              isPaused
                ? 'bg-emerald-500/10 border border-emerald-500/40 text-emerald-400'
                : 'bg-amber-500/10 border border-amber-500/40 text-amber-400'
            }`}
          >
            {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            <span>{isPaused ? 'Resume Streams' : 'Pause Streams'}</span>
          </button>

          <button
            onClick={() => setMessages([])}
            className="p-1.5 rounded bg-[#121722] border border-[#1e2638] text-slate-400 hover:text-slate-200 transition-colors"
            title="Clear buffer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Control Grid: Latency, Packet Loss & Bandwidth Telemetry */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs font-mono">
        {/* Latency Simulator */}
        <div className="bg-[#0e121b] border border-[#1c2230] p-3 rounded space-y-2">
          <div className="flex justify-between text-slate-400">
            <span className="flex items-center gap-1">
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              Stream Latency
            </span>
            <span className="text-cyan-400 font-bold">{latency} ms</span>
          </div>
          <input
            type="range"
            min="2"
            max="350"
            value={latency}
            onChange={(e) => handleLatencyChange(Number(e.target.value))}
            className="w-full accent-cyan-400 h-1 bg-[#1e2638] rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-[9px] text-slate-500">
            <span>2ms (Edge Co-located)</span>
            <span>350ms (Intercontinental)</span>
          </div>
        </div>

        {/* Packet Drop Simulator */}
        <div className="bg-[#0e121b] border border-[#1c2230] p-3 rounded space-y-2">
          <div className="flex justify-between text-slate-400">
            <span>Network Drop Rate</span>
            <span className="text-amber-400 font-bold">{packetDrop}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="20"
            value={packetDrop}
            onChange={(e) => handlePacketDropChange(Number(e.target.value))}
            className="w-full accent-amber-400 h-1 bg-[#1e2638] rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-[9px] text-slate-500">
            <span>0% (Lossless TCP)</span>
            <span>20% (Degraded UDP)</span>
          </div>
        </div>

        {/* Dispatched frames count */}
        <div className="bg-[#0e121b] border border-[#1c2230] p-3 rounded">
          <div className="text-[10px] text-slate-500 uppercase">Frames Broadcast</div>
          <div className="text-lg font-bold text-slate-100 mt-1">
            {marketDataService.totalFramesSent.toLocaleString()}
          </div>
          <div className="text-[10px] text-emerald-400 mt-0.5">Fan-out: 1 to N epoll</div>
        </div>

        {/* Data Throughput */}
        <div className="bg-[#0e121b] border border-[#1c2230] p-3 rounded">
          <div className="text-[10px] text-slate-500 uppercase">Payload Transferred</div>
          <div className="text-lg font-bold text-cyan-400 mt-1">
            {(marketDataService.totalBytesSent / 1024).toFixed(1)} KB
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Gzip compression available</div>
        </div>
      </div>

      {/* Stream Topics Filter Bar */}
      <div className="flex flex-wrap items-center gap-2 bg-[#0e121b] border border-[#1c2230] p-2 rounded text-xs font-mono">
        <span className="text-slate-400 px-2 text-[11px]">Stream Topics:</span>
        {[
          { id: 'all', label: 'All Feeds (*)' },
          { id: 'trade', label: `${cleanSymbol}@trade` },
          { id: 'ticker', label: `${cleanSymbol}@ticker` },
          { id: 'depth', label: `${cleanSymbol}@depth20@100ms` },
        ].map(topic => (
          <button
            key={topic.id}
            onClick={() => setActiveFilter(topic.id)}
            className={`px-2.5 py-1 rounded text-[11px] transition-colors ${
              activeFilter === topic.id
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 font-bold'
                : 'bg-[#121722] text-slate-400 hover:text-slate-200 border border-[#1e2638]'
            }`}
          >
            {topic.label}
          </button>
        ))}
      </div>

      {/* Real-time WebSocket Frames List */}
      <div className="bg-[#0e121b] border border-[#1c2230] rounded flex-1 flex flex-col overflow-hidden font-mono text-xs">
        <div className="px-3 py-2 border-b border-[#1c2230] bg-[#0b0e14] flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-cyan-400" />
            Live Client Socket Frame Inspection Log
          </span>
          <span>Showing {filteredMessages.length} buffered frames</span>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filteredMessages.map((msg) => (
            <div
              key={msg.id}
              className="p-3 bg-[#121722] border border-[#1e2638] rounded space-y-1.5 hover:border-[#2e3b56] transition-colors"
            >
              <div className="flex items-center justify-between text-[10px]">
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-400 font-bold">
                    {msg.stream}
                  </span>
                  <span className="text-slate-500">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                  <span className="text-slate-600">·</span>
                  <span className="text-emerald-400">+{msg.latencyMs}ms delay</span>
                </div>

                <button
                  onClick={() => handleCopyMessage(msg)}
                  className="text-slate-400 hover:text-cyan-400 flex items-center gap-1 text-[10px] transition-colors"
                >
                  {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedId === msg.id ? 'Copied' : 'Copy Payload'}</span>
                </button>
              </div>

              {/* JSON preview */}
              <pre className="p-2 rounded bg-[#0b0e14] border border-[#182030] text-[11px] text-slate-300 overflow-x-auto">
                {JSON.stringify(msg.data, null, 2)}
              </pre>
            </div>
          ))}

          {filteredMessages.length === 0 && (
            <div className="py-12 text-center text-slate-500">
              No stream frames received for current filter. Ensure streams are active.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
