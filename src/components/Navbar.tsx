import React from 'react';
import { 
  TrendingUp, 
  Wallet, 
  BookOpen, 
  Radio, 
  ShieldCheck, 
  Network, 
  Terminal, 
  Play, 
  Pause,
  Zap,
  Volume2,
  VolumeX
} from 'lucide-react';
import { sound } from '../utils/sound';

export type NavTab = 
  | 'terminal' 
  | 'custody' 
  | 'ledger' 
  | 'websocket' 
  | 'security' 
  | 'architecture' 
  | 'api';

interface NavbarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  totalEquityUsd: number;
  availableUsdt: number;
  isBotRunning: boolean;
  onToggleBot: () => void;
  avgLatencyUs: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  totalEquityUsd,
  availableUsdt,
  isBotRunning,
  onToggleBot,
  avgLatencyUs,
}) => {
  const [soundMuted, setSoundMuted] = React.useState(false);

  const toggleSound = () => {
    sound.enabled = soundMuted;
    setSoundMuted(!soundMuted);
  };

  const navItems: { id: NavTab; label: string; icon: React.ReactNode }[] = [
    { id: 'terminal', label: 'Trading Terminal', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'custody', label: 'Wallet & Custody', icon: <Wallet className="w-4 h-4" /> },
    { id: 'ledger', label: 'Double-Entry Ledger', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'websocket', label: 'Market Data & WS', icon: <Radio className="w-4 h-4" /> },
    { id: 'security', label: 'Security & Risk', icon: <ShieldCheck className="w-4 h-4" /> },
    { id: 'architecture', label: 'Microservices Arch', icon: <Network className="w-4 h-4" /> },
    { id: 'api', label: 'API Sandbox', icon: <Terminal className="w-4 h-4" /> },
  ];

  return (
    <header className="bg-[#0b0e14] border-b border-[#1c2230] px-4 py-2 flex flex-wrap items-center justify-between select-none">
      {/* Brand & Engine status */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => onTabChange('terminal')}>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-emerald-500 p-0.5 flex items-center justify-center shadow-lg shadow-emerald-500/10">
            <div className="w-full h-full bg-[#0b0e14] rounded-[6px] flex items-center justify-center">
              <Zap className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm tracking-wider text-slate-100">APEX</span>
              <span className="text-xs font-semibold text-cyan-400 tracking-widest">// PRO</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>FIFO ENGINE</span>
              <span className="text-slate-600">·</span>
              <span className="font-mono text-emerald-400">{avgLatencyUs}µs</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden lg:flex items-center gap-1 bg-[#121722] p-1 rounded-lg border border-[#1e2638]">
          {navItems.map(item => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  isActive
                    ? 'bg-[#1e2638] text-emerald-400 shadow-sm border border-[#2e3b56]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#161c2a]'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Right controls: Mobile selector, Sound, Bot Sim, User Equity */}
      <div className="flex items-center gap-3">
        {/* Mobile Nav Select */}
        <div className="lg:hidden">
          <select
            value={activeTab}
            onChange={(e) => onTabChange(e.target.value as NavTab)}
            className="bg-[#121722] border border-[#1e2638] text-xs text-slate-200 rounded px-2 py-1 outline-none"
          >
            {navItems.map(item => (
              <option key={item.id} value={item.id}>{item.label}</option>
            ))}
          </select>
        </div>

        {/* Sound toggle */}
        <button
          onClick={toggleSound}
          title={soundMuted ? 'Unmute terminal audio' : 'Mute terminal audio'}
          className="p-1.5 rounded bg-[#121722] border border-[#1e2638] text-slate-400 hover:text-slate-200 transition-colors"
        >
          {soundMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-cyan-400" />}
        </button>

        {/* Market Maker Bot Simulator */}
        <button
          onClick={onToggleBot}
          title={isBotRunning ? 'Pause Market Maker Simulation' : 'Start Market Maker Simulation'}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded border transition-all ${
            isBotRunning
              ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/20'
              : 'bg-amber-500/10 border-amber-500/40 text-amber-400 hover:bg-amber-500/20'
          }`}
        >
          {isBotRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
          <span className="hidden sm:inline">MM Flow:</span>
          <span>{isBotRunning ? 'LIVE' : 'PAUSED'}</span>
        </button>

        {/* Equity Overview */}
        <div className="hidden sm:flex items-center gap-3 bg-[#121722] border border-[#1e2638] px-3 py-1 rounded text-right">
          <div>
            <div className="text-[10px] text-slate-400 font-medium">TOTAL EQUITY</div>
            <div className="text-xs font-mono font-bold text-slate-100">
              ${totalEquityUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="w-[1px] h-6 bg-[#1e2638]" />
          <div>
            <div className="text-[10px] text-slate-400 font-medium">AVAIL USDT</div>
            <div className="text-xs font-mono text-emerald-400">
              ${availableUsdt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
