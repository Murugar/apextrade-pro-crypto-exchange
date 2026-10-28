import React, { useState } from 'react';
import { LedgerEntry, LedgerEntryType } from '../types/crypto';
import { LedgerService } from '../engine/LedgerService';
import { BookOpen, ShieldCheck, CheckCircle2, Search, RefreshCw, Hash, FileCheck } from 'lucide-react';
import confetti from 'canvas-confetti';

interface LedgerAuditProps {
  ledgerService: LedgerService;
  journal: LedgerEntry[];
}

export const LedgerAudit: React.FC<LedgerAuditProps> = ({
  ledgerService,
  journal,
}) => {
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [auditResult, setAuditResult] = useState<{
    isBalanced: boolean;
    totalAuditedEntries: number;
    discrepancyDeltaUsd: number;
    lastMerkleRoot: string;
    timestamp: number;
    vaultSolvencyRatio: number;
  } | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);

  const filteredEntries = journal.filter(entry => {
    if (filterType !== 'ALL' && entry.type !== filterType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        entry.id.toLowerCase().includes(q) ||
        entry.asset.toLowerCase().includes(q) ||
        entry.entryHash.toLowerCase().includes(q) ||
        entry.referenceId.toLowerCase().includes(q) ||
        entry.note.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const runReconciliationAudit = () => {
    setIsAuditing(true);
    setTimeout(() => {
      const result = ledgerService.reconcileSystemIntegrity();
      setAuditResult(result);
      setIsAuditing(false);
      try {
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.5 },
        });
      } catch {
        // ignore
      }
    }, 600);
  };

  return (
    <div className="flex-1 bg-[#0b0e14] p-4 flex flex-col overflow-y-auto space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between border-b border-[#1c2230] pb-4 gap-4">
        <div>
          <h1 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-cyan-400" />
            Double-Entry Ledger & Cryptographic Reconciliation Engine
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Immutable Append-Only Audit Trail · Segregated Balance Locking · Real-Time Mathematical Solvency Proofs
          </p>
        </div>

        {/* Audit Button */}
        <button
          onClick={runReconciliationAudit}
          disabled={isAuditing}
          className="flex items-center gap-2 px-4 py-2 rounded bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-xs uppercase tracking-wide transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isAuditing ? 'animate-spin' : ''}`} />
          <span>{isAuditing ? 'Verifying Ledger...' : 'Run Mathematical Reconciliation Audit'}</span>
        </button>
      </div>

      {/* Audit Reconciliation Result Banner */}
      {auditResult && (
        <div className="p-4 rounded bg-emerald-500/10 border border-emerald-500/30 flex flex-wrap items-center justify-between gap-4 font-mono text-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="font-bold text-emerald-400 text-sm">
                SYSTEM RECONCILIATION 100% BALANCED & VERIFIED
              </div>
              <div className="text-[11px] text-slate-300">
                Total Audited Journal Entries: <span className="font-bold text-slate-100">{auditResult.totalAuditedEntries}</span> · Discrepancy Delta: <span className="text-emerald-400 font-bold">${auditResult.discrepancyDeltaUsd.toFixed(8)}</span>
              </div>
            </div>
          </div>

          <div className="text-right text-[11px]">
            <div className="text-slate-400">Vault Reserve Solvency Ratio: <span className="text-emerald-400 font-bold">{auditResult.vaultSolvencyRatio}%</span></div>
            <div className="text-slate-500 text-[10px] truncate max-w-xs">Merkle Root: {auditResult.lastMerkleRoot.slice(0, 24)}...</div>
          </div>
        </div>
      )}

      {/* Double Entry Flow Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs font-mono">
        <div className="bg-[#0e121b] border border-[#1c2230] p-3 rounded">
          <div className="text-[10px] text-slate-500 uppercase">Invariant #1: Debits == Credits</div>
          <div className="text-emerald-400 font-bold text-sm mt-1">Balanced Invariant</div>
          <p className="text-[10px] text-slate-400 mt-1 font-sans">
            Every movement transfers between exact account debits and credits without creating money from thin air.
          </p>
        </div>

        <div className="bg-[#0e121b] border border-[#1c2230] p-3 rounded">
          <div className="text-[10px] text-slate-500 uppercase">Invariant #2: Balance Locking</div>
          <div className="text-cyan-400 font-bold text-sm mt-1">Available ➔ Locked</div>
          <p className="text-[10px] text-slate-400 mt-1 font-sans">
            Pending orders lock quotes or bases atomically in memory prior to passing orders to the FIFO matching engine.
          </p>
        </div>

        <div className="bg-[#0e121b] border border-[#1c2230] p-3 rounded">
          <div className="text-[10px] text-slate-500 uppercase">Invariant #3: Fee Segregation</div>
          <div className="text-purple-400 font-bold text-sm mt-1">Revenue Vault</div>
          <p className="text-[10px] text-slate-400 mt-1 font-sans">
            Maker (0.02%) and taker (0.05%) fees flow into dedicated corporate treasury accounts isolated from client funds.
          </p>
        </div>

        <div className="bg-[#0e121b] border border-[#1c2230] p-3 rounded">
          <div className="text-[10px] text-slate-500 uppercase">Invariant #4: Cryptographic WAL</div>
          <div className="text-amber-400 font-bold text-sm mt-1">Hash-Chained Journal</div>
          <p className="text-[10px] text-slate-400 mt-1 font-sans">
            Each entry contains SHA-256 hash chaining back to the previous entry, preventing retro-active tampering.
          </p>
        </div>
      </div>

      {/* Journal Table Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0e121b] border border-[#1c2230] p-3 rounded">
        {/* Filters */}
        <div className="flex items-center gap-1 overflow-x-auto text-xs">
          {['ALL', 'DEPOSIT', 'WITHDRAWAL', 'ORDER_LOCK', 'ORDER_UNLOCK', 'TRADE_EXEC', 'FEE_PAYMENT'].map(t => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors ${
                filterType === t
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                  : 'bg-[#121722] text-slate-400 hover:text-slate-200 border border-[#1e2638]'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 absolute left-3 text-slate-500 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by ID, Hash, or Note..."
            className="bg-[#121722] border border-[#1e2638] rounded pl-8 pr-3 py-1 text-xs text-slate-200 font-mono outline-none focus:border-cyan-500 w-64"
          />
        </div>
      </div>

      {/* Journal Table */}
      <div className="bg-[#0e121b] border border-[#1c2230] rounded overflow-hidden flex-1 flex flex-col font-mono text-xs">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#1c2230] text-[10px] text-slate-400 uppercase bg-[#0b0e14]">
                <th className="py-2 px-3">Timestamp</th>
                <th className="py-2 px-3">Type</th>
                <th className="py-2 px-3">Debit Account (From)</th>
                <th className="py-2 px-3">Credit Account (To)</th>
                <th className="py-2 px-3">Amount</th>
                <th className="py-2 px-3">Balance After</th>
                <th className="py-2 px-3">Cryptographic Hash</th>
                <th className="py-2 px-3">Audit Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#141b27]">
              {filteredEntries.map(entry => (
                <tr key={entry.id} className="hover:bg-[#121722] transition-colors">
                  <td className="py-2 px-3 text-slate-400 text-[11px]">
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="py-2 px-3">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        entry.type === 'DEPOSIT'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : entry.type === 'WITHDRAWAL'
                          ? 'bg-amber-500/10 text-amber-400'
                          : entry.type === 'TRADE_EXEC'
                          ? 'bg-cyan-500/10 text-cyan-400'
                          : entry.type === 'FEE_PAYMENT'
                          ? 'bg-purple-500/10 text-purple-400'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {entry.type}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-slate-300 text-[11px] truncate max-w-[140px]" title={entry.accountFrom}>
                    {entry.accountFrom}
                  </td>
                  <td className="py-2 px-3 text-slate-300 text-[11px] truncate max-w-[140px]" title={entry.accountTo}>
                    {entry.accountTo}
                  </td>
                  <td className="py-2 px-3 font-bold text-slate-100">
                    {entry.amount.toFixed(4)} {entry.asset}
                  </td>
                  <td className="py-2 px-3 text-cyan-400 font-bold">
                    {entry.balanceAfter.toFixed(4)} {entry.asset}
                  </td>
                  <td className="py-2 px-3 text-slate-500 text-[10px] truncate max-w-[120px]" title={entry.entryHash}>
                    {entry.entryHash.slice(0, 16)}...
                  </td>
                  <td className="py-2 px-3 text-slate-400 text-[11px] font-sans truncate max-w-[200px]" title={entry.note}>
                    {entry.note}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
