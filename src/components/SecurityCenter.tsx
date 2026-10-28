import React, { useState, useEffect } from 'react';
import { SecurityService, ApiKeyRecord } from '../services/SecurityService';
import { 
  ShieldCheck, 
  ShieldAlert, 
  AlertTriangle, 
  Lock, 
  Key, 
  Sliders, 
  Flame, 
  RotateCcw, 
  Trash2, 
  Check, 
  Activity,
  Terminal,
  Server
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface SecurityCenterProps {
  securityService: SecurityService;
  currentSymbol: string;
}

export const SecurityCenter: React.FC<SecurityCenterProps> = ({
  securityService,
  currentSymbol,
}) => {
  const [tokens, setTokens] = useState(securityService.currentTokens);
  const [allowedCount, setAllowedCount] = useState(securityService.totalRequestsAllowed);
  const [throttledCount, setThrottledCount] = useState(securityService.totalRequestsThrottled);
  const [rateLimitMessage, setRateLimitMessage] = useState<string | null>(null);

  // New API key form
  const [keyName, setKeyName] = useState('');
  const [readPerm, setReadPerm] = useState(true);
  const [tradePerm, setTradePerm] = useState(true);
  const [withdrawPerm, setWithdrawPerm] = useState(false);
  const [ipWhitelist, setIpWhitelist] = useState('192.168.1.100');
  const [apiKeys, setApiKeys] = useState<ApiKeyRecord[]>(securityService.getApiKeys());

  // Circuit breaker state
  const isCircuitBreakerTripped = securityService.circuitBreakers.get(currentSymbol)?.tripped || false;

  // Refresh token bucket display
  useEffect(() => {
    const timer = setInterval(() => {
      // Small passive refill update
      securityService.checkRateLimit(0);
      setTokens(Math.floor(securityService.currentTokens));
      setAllowedCount(securityService.totalRequestsAllowed);
      setThrottledCount(securityService.totalRequestsThrottled);
    }, 200);

    return () => clearInterval(timer);
  }, [securityService]);

  const handleTestBurst = (count: number) => {
    setRateLimitMessage(null);
    let success = 0;
    let failed = 0;

    for (let i = 0; i < count; i++) {
      const res = securityService.checkRateLimit(1);
      if (res.allowed) {
        success++;
      } else {
        failed++;
      }
    }

    setTokens(Math.floor(securityService.currentTokens));
    setAllowedCount(securityService.totalRequestsAllowed);
    setThrottledCount(securityService.totalRequestsThrottled);

    if (failed > 0) {
      setRateLimitMessage(`HTTP 429 Too Many Requests: ${failed} requests throttled! (Allowed: ${success}/${count})`);
    } else {
      setRateLimitMessage(`Success: ${success}/${count} burst requests accepted by gateway.`);
    }
  };

  const handleToggleCircuitBreaker = () => {
    if (isCircuitBreakerTripped) {
      securityService.circuitBreakers.delete(currentSymbol);
      securityService.logAudit({
        level: 'INFO',
        eventType: 'CIRCUIT_BREAKER_MANUAL_RESET',
        ipAddress: 'Risk_Operator',
        userAgent: 'Console/2.0',
        details: `Trading manually re-opened for ${currentSymbol}`,
      });
    } else {
      securityService.tripCircuitBreaker(currentSymbol, 'Extreme simulated volatility spike (> 7% / 15s)');
    }
  };

  const handleCreateApiKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyName.trim()) return;

    const ips = ipWhitelist.split(',').map(s => s.trim()).filter(Boolean);
    const newKey = securityService.createApiKey(
      keyName,
      { read: readPerm, trade: tradePerm, withdraw: withdrawPerm },
      ips
    );

    setApiKeys(securityService.getApiKeys());
    setKeyName('');
    try {
      confetti({ particleCount: 25, spread: 40 });
    } catch {
      // ignore
    }
  };

  const handleRevokeKey = (id: string) => {
    securityService.revokeApiKey(id);
    setApiKeys(securityService.getApiKeys());
  };

  const auditLogs = securityService.getAuditLogs();
  const tokenPct = (tokens / securityService.bucketCapacity) * 100;

  return (
    <div className="flex-1 bg-[#0b0e14] p-4 flex flex-col overflow-y-auto space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between border-b border-[#1c2230] pb-4 gap-4">
        <div>
          <h1 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-cyan-400" />
            Security Architecture & Threat Modeling Center
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Distributed Leaky Bucket Rate Limiting · Anti-Wash Trading (SMP) · Volatility Circuit Breakers · HMAC Signers
          </p>
        </div>

        {/* Global Security Posture Indicator */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="flex items-center gap-1.5 px-3 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            SHIELD LEVEL: MAXIMUM
          </span>
        </div>
      </div>

      {/* Grid: Rate Limiter & Threat Modeling Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Token-Bucket Rate Limiter Simulator */}
        <div className="lg:col-span-6 bg-[#0e121b] border border-[#1c2230] p-4 rounded space-y-4 font-mono text-xs">
          <div className="flex items-center justify-between">
            <div className="font-bold text-slate-200 flex items-center gap-2 text-sm">
              <Sliders className="w-4 h-4 text-cyan-400" />
              Token-Bucket Rate Limiter (Edge Gateway)
            </div>
            <span className="text-[10px] text-slate-400">Refill: +{securityService.refillRatePerSec} tokens/sec</span>
          </div>

          <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
            Protects downstream matching engine from DDoS and order book spam. Requests consume tokens from an in-memory leaky bucket. When depleted, edge proxies return HTTP 429 Too Many Requests with microsecond precision.
          </p>

          {/* Available Tokens Gauge */}
          <div className="p-3 bg-[#121722] border border-[#1e2638] rounded space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Available Token Reservoir:</span>
              <span className={`font-bold text-sm ${tokens < 10 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {tokens} / {securityService.bucketCapacity} Tokens
              </span>
            </div>

            <div className="w-full bg-[#1a2232] h-2.5 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-200 ${
                  tokens < 10 ? 'bg-rose-500' : tokens < 30 ? 'bg-amber-400' : 'bg-emerald-400'
                }`}
                style={{ width: `${tokenPct}%` }}
              />
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 pt-1">
              <div>Allowed Requests: <span className="text-slate-200 font-bold">{allowedCount.toLocaleString()}</span></div>
              <div>Throttled (429): <span className="text-rose-400 font-bold">{throttledCount.toLocaleString()}</span></div>
            </div>
          </div>

          {/* Interactive Burst Buttons */}
          <div className="space-y-2">
            <div className="text-[11px] text-slate-400">Simulate Traffic Spike:</div>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleTestBurst(1)}
                className="py-1.5 rounded bg-[#182030] hover:bg-[#202b40] text-slate-200 border border-[#2e3b56] transition-colors"
              >
                1 Req (Normal)
              </button>
              <button
                onClick={() => handleTestBurst(15)}
                className="py-1.5 rounded bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 transition-colors"
              >
                15 Req (Burst)
              </button>
              <button
                onClick={() => handleTestBurst(65)}
                className="py-1.5 rounded bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 transition-colors font-bold"
              >
                65 Req (Spam / 429)
              </button>
            </div>
          </div>

          {rateLimitMessage && (
            <div
              className={`p-2.5 rounded text-[11px] ${
                rateLimitMessage.includes('429')
                  ? 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
                  : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
              }`}
            >
              {rateLimitMessage}
            </div>
          )}
        </div>

        {/* Threat Modeling & Surveillance Rules */}
        <div className="lg:col-span-6 bg-[#0e121b] border border-[#1c2230] p-4 rounded space-y-4 font-mono text-xs">
          <div className="flex items-center justify-between">
            <div className="font-bold text-slate-200 flex items-center gap-2 text-sm">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              Threat Surveillance & Circuit Breakers
            </div>
            <span className="text-[10px] text-emerald-400 font-bold">ALL SURVEILLANCE ACTIVE</span>
          </div>

          {/* Active Rules List */}
          <div className="space-y-2.5">
            {/* Anti-Wash Trading */}
            <div className="p-3 bg-[#121722] border border-[#1e2638] rounded flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-200">Self-Trade Prevention (SMP)</div>
                <div className="text-[10px] text-slate-400 font-sans mt-0.5">
                  Prevents wash trading by matching buyer/seller against the same account or API key group. Mode: <span className="text-cyan-400">CANCEL_MAKER</span>.
                </div>
              </div>
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/30 shrink-0">
                ENABLED
              </span>
            </div>

            {/* Quote Stuffing / Spoofing */}
            <div className="p-3 bg-[#121722] border border-[#1e2638] rounded flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-200">Anti-Spoofing & Order-to-Trade Ratio</div>
                <div className="text-[10px] text-slate-400 font-sans mt-0.5">
                  Flags high-frequency cancellation bots placing and pulling quotes within &lt;20ms to distort visual depth.
                </div>
              </div>
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/30 shrink-0">
                ACTIVE
              </span>
            </div>

            {/* Price Band Protection */}
            <div className="p-3 bg-[#121722] border border-[#1e2638] rounded flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-200">Fat-Finger Price Band Limit (±25%)</div>
                <div className="text-[10px] text-slate-400 font-sans mt-0.5">
                  Immediately rejects any limit or market order price that deviates abnormally from the global index price.
                </div>
              </div>
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/30 shrink-0">
                ENFORCED
              </span>
            </div>

            {/* Volatility Circuit Breaker */}
            <div className={`p-3 rounded border transition-colors flex items-center justify-between ${
              isCircuitBreakerTripped
                ? 'bg-rose-500/15 border-rose-500/40'
                : 'bg-[#121722] border-[#1e2638]'
            }`}>
              <div>
                <div className="font-bold text-slate-200 flex items-center gap-1.5">
                  <span>Volatility Circuit Breaker ({currentSymbol})</span>
                  {isCircuitBreakerTripped && (
                    <span className="text-rose-400 text-[10px] font-bold animate-pulse">TRIPPED / HALT</span>
                  )}
                </div>
                <div className="text-[10px] text-slate-400 font-sans mt-0.5">
                  Automatically freezes trading if price moves &gt;7% within 60s to prevent flash-crash cascades.
                </div>
              </div>

              <button
                onClick={handleToggleCircuitBreaker}
                className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase transition-colors shrink-0 ${
                  isCircuitBreakerTripped
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                    : 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/40'
                }`}
              >
                {isCircuitBreakerTripped ? 'Resume Trading' : 'Test Trip Halt'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* API Key Provisioning & Management */}
      <div className="bg-[#0e121b] border border-[#1c2230] p-4 rounded space-y-4 font-mono text-xs">
        <div className="flex items-center justify-between">
          <div className="font-bold text-slate-200 flex items-center gap-2 text-sm">
            <Key className="w-4 h-4 text-cyan-400" />
            HMAC-SHA256 API Key Management
          </div>
          <span className="text-[10px] text-slate-400">Cryptographically signed via Ed25519 & HMAC</span>
        </div>

        {/* Generate New Key Form */}
        <form onSubmit={handleCreateApiKey} className="p-3 bg-[#121722] border border-[#1e2638] rounded space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Key Label</label>
              <input
                type="text"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                placeholder="e.g. Algo Bot Node #3"
                className="w-full bg-[#0b0e14] border border-[#1a2232] rounded px-3 py-1.5 text-slate-200 outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-400 block mb-1">IP Whitelist (CIDR / comma-sep)</label>
              <input
                type="text"
                value={ipWhitelist}
                onChange={(e) => setIpWhitelist(e.target.value)}
                placeholder="192.168.1.100, 10.0.0.1"
                className="w-full bg-[#0b0e14] border border-[#1a2232] rounded px-3 py-1.5 text-slate-200 outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Granular Scopes</label>
              <div className="flex items-center gap-3 pt-1 text-[11px]">
                <label className="flex items-center gap-1 cursor-pointer">
                  <input type="checkbox" checked={readPerm} onChange={(e) => setReadPerm(e.target.checked)} />
                  <span>Read</span>
                </label>
                <label className="flex items-center gap-1 cursor-pointer">
                  <input type="checkbox" checked={tradePerm} onChange={(e) => setTradePerm(e.target.checked)} />
                  <span>Trade</span>
                </label>
                <label className="flex items-center gap-1 cursor-pointer text-amber-400">
                  <input type="checkbox" checked={withdrawPerm} onChange={(e) => setWithdrawPerm(e.target.checked)} />
                  <span>Withdraw</span>
                </label>
              </div>
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                className="w-full py-1.5 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold uppercase transition-all shadow-md"
              >
                Provision API Key
              </button>
            </div>
          </div>
        </form>

        {/* Existing Keys Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#1c2230] text-[10px] text-slate-400 uppercase bg-[#0b0e14]">
                <th className="py-2 px-3">Name</th>
                <th className="py-2 px-3">API Key (Public)</th>
                <th className="py-2 px-3">API Secret (Masked)</th>
                <th className="py-2 px-3">Permissions</th>
                <th className="py-2 px-3">IP Restrictions</th>
                <th className="py-2 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#141b27]">
              {apiKeys.map(k => (
                <tr key={k.id} className="hover:bg-[#121722] transition-colors">
                  <td className="py-2 px-3 font-bold text-slate-200">{k.name}</td>
                  <td className="py-2 px-3 text-cyan-400 select-all">{k.apiKey}</td>
                  <td className="py-2 px-3 text-slate-400">{k.apiSecretMasked}</td>
                  <td className="py-2 px-3">
                    <span className="text-[10px] space-x-1">
                      {k.permissions.read && <span className="text-emerald-400">READ</span>}
                      {k.permissions.trade && <span className="text-cyan-400">TRADE</span>}
                      {k.permissions.withdraw && <span className="text-amber-400 font-bold">WITHDRAW</span>}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-slate-300 text-[10px]">{k.ipWhitelist.join(', ')}</td>
                  <td className="py-2 px-3 text-right">
                    <button
                      onClick={() => handleRevokeKey(k.id)}
                      className="px-2 py-0.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[10px] border border-rose-500/30 transition-colors"
                    >
                      Revoke Key
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Security Audit Trail */}
      <div className="bg-[#0e121b] border border-[#1c2230] p-4 rounded space-y-3 font-mono text-xs">
        <div className="flex items-center justify-between">
          <div className="font-bold text-slate-200 flex items-center gap-2 text-sm">
            <Terminal className="w-4 h-4 text-cyan-400" />
            Immutable Security Audit Event Log
          </div>
          <span className="text-[10px] text-slate-400">SIEM Connected · SOC 2 Compliant</span>
        </div>

        <div className="space-y-1.5 max-h-56 overflow-y-auto">
          {auditLogs.map(log => (
            <div
              key={log.id}
              className="p-2.5 bg-[#121722] border border-[#1e2638] rounded flex items-center justify-between gap-3 text-[11px]"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                    log.level === 'CRITICAL'
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                      : log.level === 'WARNING'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  }`}
                >
                  {log.level}
                </span>
                <span className="font-bold text-slate-200">{log.eventType}</span>
                <span className="text-slate-400 font-sans">{log.details}</span>
              </div>
              <div className="text-right text-[10px] text-slate-500 shrink-0">
                <div>{new Date(log.timestamp).toLocaleTimeString()}</div>
                <div>{log.ipAddress}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
