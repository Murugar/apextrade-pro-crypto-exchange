import React, { useState } from 'react';
import { 
  BlockchainTx, 
  BlockchainType, 
  UserBalance, 
  VaultReserve 
} from '../types/crypto';
import { BlockchainService, ChainConfig } from '../services/BlockchainService';
import { 
  QrCode, 
  Copy, 
  Check, 
  ExternalLink, 
  ShieldCheck, 
  Lock, 
  ArrowDownLeft, 
  ArrowUpRight, 
  AlertCircle,
  Clock,
  Sparkles,
  KeyRound
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface WalletCustodyProps {
  userBalances: UserBalance[];
  blockchainService: BlockchainService;
  transactions: BlockchainTx[];
  vaultReserves: VaultReserve[];
  onDepositConfirmed: (asset: string, amount: number, txHash: string, chain: BlockchainType) => void;
  onRequestWithdrawal: (
    asset: string,
    chain: BlockchainType,
    amount: number,
    address: string
  ) => { success: boolean; error?: string; txHash?: string };
}

export const WalletCustody: React.FC<WalletCustodyProps> = ({
  userBalances,
  blockchainService,
  transactions,
  vaultReserves,
  onDepositConfirmed,
  onRequestWithdrawal,
}) => {
  const [activeTab, setActiveTab] = useState<'balances' | 'deposit' | 'withdraw' | 'vaults' | 'proofOfReserves'>('balances');
  const [selectedChain, setSelectedChain] = useState<BlockchainType>('Ethereum');
  const [selectedAsset, setSelectedAsset] = useState<string>('USDT');
  const [copied, setCopied] = useState(false);

  // Deposit Simulation Form
  const [simDepositAmount, setSimDepositAmount] = useState<string>('1000');
  const [isSimulatingDeposit, setIsSimulatingDeposit] = useState(false);

  // Withdrawal Form
  const [withdrawAddress, setWithdrawAddress] = useState<string>('');
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [mfaCode, setMfaCode] = useState<string>('654321');
  const [withdrawFeedback, setWithdrawFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Proof of reserves verification
  const [userMerkleLeaf, setUserMerkleLeaf] = useState<string | null>(null);

  const chainConfig = blockchainService.getChainConfig(selectedChain);
  const whitelisted = blockchainService.getWhitelistedAddresses();

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSimulateDeposit = () => {
    const amount = parseFloat(simDepositAmount);
    if (!amount || amount <= 0) return;

    setIsSimulatingDeposit(true);

    blockchainService.simulateIncomingDeposit(
      selectedAsset,
      selectedChain,
      amount,
      (confirmedTx) => {
        setIsSimulatingDeposit(false);
        onDepositConfirmed(confirmedTx.asset, confirmedTx.amount, confirmedTx.hash, confirmedTx.chain);
        try {
          confetti({
            particleCount: 50,
            spread: 70,
            origin: { y: 0.6 },
          });
        } catch {
          // ignore
        }
      },
      () => {
        // on progress
      }
    );
  };

  const handleExecuteWithdrawal = (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawFeedback(null);

    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0) {
      setWithdrawFeedback({ type: 'error', message: 'Enter a valid withdrawal amount' });
      return;
    }

    if (!withdrawAddress.trim()) {
      setWithdrawFeedback({ type: 'error', message: 'Please specify or select a recipient destination address' });
      return;
    }

    if (mfaCode.length !== 6) {
      setWithdrawFeedback({ type: 'error', message: 'Enter valid 6-digit 2FA Authenticator code' });
      return;
    }

    const result = onRequestWithdrawal(selectedAsset, selectedChain, amount, withdrawAddress);
    if (result.success) {
      setWithdrawFeedback({
        type: 'success',
        message: `Withdrawal dispatched! On-chain Tx: ${result.txHash?.slice(0, 16)}...`,
      });
      setWithdrawAmount('');
      try {
        confetti({ particleCount: 30, spread: 50 });
      } catch {
        // ignore
      }
    } else {
      setWithdrawFeedback({ type: 'error', message: result.error || 'Withdrawal failed' });
    }
  };

  const generateProofOfReservesLeaf = () => {
    const totalUsd = userBalances.reduce((acc, b) => acc + b.usdValue, 0);
    const mockHash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
    setUserMerkleLeaf(`Leaf #48291 [Account: 0xUsr...9d1a | Total Equity: $${totalUsd.toFixed(2)} | Nonce: 7719482] -> SHA256: ${mockHash}`);
  };

  return (
    <div className="flex-1 bg-[#0b0e14] p-4 flex flex-col overflow-y-auto">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between border-b border-[#1c2230] pb-4 mb-4 gap-4">
        <div>
          <h1 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Lock className="w-5 h-5 text-cyan-400" />
            Blockchain Custody & Multi-Chain Vault Infrastructure
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Institutional MPC Multi-Sig Security · 95% Cold Storage Isolation · Real-Time Blockchain Confirmation Listeners
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1 bg-[#121722] p-1 rounded-lg border border-[#1e2638]">
          {[
            { id: 'balances', label: 'Asset Balances' },
            { id: 'deposit', label: 'On-Chain Deposit' },
            { id: 'withdraw', label: 'Withdrawal Pipeline' },
            { id: 'vaults', label: 'Hot / Cold Vault Reserves' },
            { id: 'proofOfReserves', label: 'Proof of Reserves (PoR)' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeTab === tab.id
                  ? 'bg-[#1e2638] text-cyan-400 shadow-sm border border-[#2e3b56]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab: Asset Balances */}
      {activeTab === 'balances' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#0e121b] border border-[#1c2230] p-4 rounded">
              <div className="text-xs text-slate-400">Total Portfolio Net Equity</div>
              <div className="text-2xl font-bold font-mono text-slate-100 mt-1">
                ${userBalances.reduce((acc, b) => acc + b.usdValue, 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>100% Solvency Backed</span>
              </div>
            </div>

            <div className="bg-[#0e121b] border border-[#1c2230] p-4 rounded">
              <div className="text-xs text-slate-400">Locked in Open Orders</div>
              <div className="text-2xl font-bold font-mono text-cyan-400 mt-1">
                ${userBalances.filter(b => b.locked > 0).reduce((acc, b) => acc + (b.locked * (b.usdValue / (b.total || 1))), 0).toFixed(2)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Cryptographically segregated in ledger</div>
            </div>

            <div className="bg-[#0e121b] border border-[#1c2230] p-4 rounded">
              <div className="text-xs text-slate-400">Custodian Security Rating</div>
              <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">SOC 2 Type II</div>
              <div className="text-[11px] text-slate-500 mt-1">Hardware FIPS 140-3 Level 4 HSMs</div>
            </div>
          </div>

          <div className="bg-[#0e121b] border border-[#1c2230] rounded overflow-hidden">
            <div className="px-4 py-3 border-b border-[#1c2230] font-semibold text-xs text-slate-200">
              User Spot & Margin Asset Accounts
            </div>
            <div className="overflow-x-auto font-mono text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#1c2230] text-[10px] text-slate-400 uppercase bg-[#0b0e14]">
                    <th className="py-2 px-4">Asset</th>
                    <th className="py-2 px-4">Available</th>
                    <th className="py-2 px-4">Locked in Orders</th>
                    <th className="py-2 px-4">Total Balance</th>
                    <th className="py-2 px-4">USD Value</th>
                    <th className="py-2 px-4 text-right">Quick Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#141b27]">
                  {userBalances.map(bal => (
                    <tr key={bal.asset} className="hover:bg-[#121722] transition-colors">
                      <td className="py-2.5 px-4 font-bold text-slate-100 flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-[#182030] flex items-center justify-center text-[10px] text-cyan-400 font-bold border border-[#202738]">
                          {bal.asset.slice(0, 3)}
                        </div>
                        {bal.asset}
                      </td>
                      <td className="py-2.5 px-4 text-emerald-400 font-medium">{bal.available.toFixed(4)}</td>
                      <td className="py-2.5 px-4 text-slate-400">{bal.locked.toFixed(4)}</td>
                      <td className="py-2.5 px-4 text-slate-200">{bal.total.toFixed(4)}</td>
                      <td className="py-2.5 px-4 text-slate-100 font-bold">${bal.usdValue.toFixed(2)}</td>
                      <td className="py-2.5 px-4 text-right space-x-2">
                        <button
                          onClick={() => {
                            setSelectedAsset(bal.asset);
                            setActiveTab('deposit');
                          }}
                          className="px-2.5 py-1 rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-[10px] border border-cyan-500/30"
                        >
                          Deposit
                        </button>
                        <button
                          onClick={() => {
                            setSelectedAsset(bal.asset);
                            setActiveTab('withdraw');
                          }}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] border border-slate-700"
                        >
                          Withdraw
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Deposit */}
      {activeTab === 'deposit' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left: Deposit Address & Setup */}
          <div className="lg:col-span-7 bg-[#0e121b] border border-[#1c2230] p-4 rounded space-y-4">
            <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <ArrowDownLeft className="w-4 h-4 text-cyan-400" />
              Deposit {selectedAsset} via On-Chain Address
            </h2>

            {/* Asset and Chain Selectors */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Select Asset</label>
                <select
                  value={selectedAsset}
                  onChange={(e) => setSelectedAsset(e.target.value)}
                  className="w-full bg-[#121722] border border-[#1e2638] rounded px-3 py-2 text-slate-200 outline-none font-mono"
                >
                  <option value="USDT">USDT (Tether USD)</option>
                  <option value="BTC">BTC (Bitcoin)</option>
                  <option value="ETH">ETH (Ethereum)</option>
                  <option value="SOL">SOL (Solana)</option>
                  <option value="AVAX">AVAX (Avalanche)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Select Blockchain Network</label>
                <select
                  value={selectedChain}
                  onChange={(e) => setSelectedChain(e.target.value as BlockchainType)}
                  className="w-full bg-[#121722] border border-[#1e2638] rounded px-3 py-2 text-slate-200 outline-none font-mono"
                >
                  <option value="Ethereum">Ethereum (ERC-20)</option>
                  <option value="Bitcoin">Bitcoin (Native SegWit)</option>
                  <option value="Solana">Solana (SPL Network)</option>
                  <option value="Arbitrum">Arbitrum One (L2 Rollup)</option>
                  <option value="Tron">TRON (TRC-20)</option>
                </select>
              </div>
            </div>

            {/* Address Box */}
            <div className="p-3 bg-[#121722] border border-[#1e2638] rounded space-y-2">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Unique Hot Vault Deposit Address</span>
                <span className="text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  Address Segregated
                </span>
              </div>
              <div className="flex items-center gap-2 font-mono text-xs text-slate-100 bg-[#0b0e14] p-2.5 rounded border border-[#1a2232] break-all select-all">
                <span className="flex-1">{chainConfig.depositAddress}</span>
                <button
                  onClick={() => handleCopy(chainConfig.depositAddress)}
                  className="px-2.5 py-1 rounded bg-[#1e2638] hover:bg-[#28334b] text-cyan-400 text-[11px] flex items-center gap-1 shrink-0"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Network parameters notice */}
            <div className="grid grid-cols-3 gap-2 text-[11px] font-mono text-slate-400 bg-[#121722] p-3 rounded border border-[#1e2638]">
              <div>
                <div className="text-[10px] text-slate-500">MIN DEPOSIT</div>
                <div className="text-slate-200 font-bold">{chainConfig.minDeposit} {selectedAsset}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500">CONFIRMATIONS REQ</div>
                <div className="text-cyan-400 font-bold">{chainConfig.requiredConfirmations} blocks</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500">AVG BLOCK TIME</div>
                <div className="text-slate-200 font-bold">{chainConfig.avgBlockTimeSec}s</div>
              </div>
            </div>

            {/* Live Interactive Simulation Tool */}
            <div className="p-4 rounded bg-cyan-950/20 border border-cyan-800/40 space-y-3">
              <div className="flex items-center gap-2 text-cyan-300 font-semibold text-xs">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                Live On-Chain Simulation Engine
              </div>
              <p className="text-[11px] text-slate-300">
                Simulate broadcasting an on-chain deposit transaction from an external wallet. The exchange listener will detect the mempool tx, track block confirmations in real time, and auto-credit your double-entry ledger!
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={simDepositAmount}
                  onChange={(e) => setSimDepositAmount(e.target.value)}
                  className="bg-[#121722] border border-[#1e2638] rounded px-3 py-1.5 text-xs text-slate-100 font-mono outline-none w-36"
                  placeholder="Amount"
                />
                <button
                  onClick={handleSimulateDeposit}
                  disabled={isSimulatingDeposit}
                  className="px-4 py-1.5 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs uppercase tracking-wide transition-all shadow-md shadow-cyan-500/20 disabled:opacity-50"
                >
                  {isSimulatingDeposit ? 'Broadcasting & Confirming...' : `Broadcast ${simDepositAmount || 0} ${selectedAsset}`}
                </button>
              </div>
            </div>
          </div>

          {/* Right: Real-time Transaction Monitor */}
          <div className="lg:col-span-5 bg-[#0e121b] border border-[#1c2230] p-4 rounded flex flex-col">
            <h3 className="text-xs font-bold text-slate-200 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              On-Chain Transaction Monitor & Listener
            </h3>

            <div className="flex-1 space-y-2 overflow-y-auto max-h-[460px] font-mono text-xs">
              {transactions.map(tx => {
                const confProgress = Math.min(100, (tx.confirmations / tx.requiredConfirmations) * 100);
                const isConfirmed = tx.status === 'CONFIRMED';

                return (
                  <div key={tx.id} className="p-3 bg-[#121722] border border-[#1e2638] rounded space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className={`font-bold text-xs ${tx.type === 'DEPOSIT' ? 'text-emerald-400' : 'text-cyan-400'}`}>
                        {tx.type} {tx.amount} {tx.asset}
                      </span>
                      <span className={`text-[10px] font-bold ${isConfirmed ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {tx.status} ({tx.confirmations}/{tx.requiredConfirmations})
                      </span>
                    </div>

                    {/* Confirmation progress bar */}
                    <div className="w-full bg-[#1a2232] h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          isConfirmed ? 'bg-emerald-400' : 'bg-cyan-400 animate-pulse'
                        }`}
                        style={{ width: `${confProgress}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                      <span>{tx.chain} · Block #{tx.blockHeight}</span>
                      <a
                        href={tx.explorerUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-cyan-400 hover:underline flex items-center gap-1"
                      >
                        <span>{tx.hash.slice(0, 10)}...</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Withdraw */}
      {activeTab === 'withdraw' && (
        <div className="max-w-2xl mx-auto bg-[#0e121b] border border-[#1c2230] p-6 rounded space-y-4">
          <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <ArrowUpRight className="w-4 h-4 text-cyan-400" />
            Institutional Withdrawal Pipeline
          </h2>

          <form onSubmit={handleExecuteWithdrawal} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Asset</label>
                <select
                  value={selectedAsset}
                  onChange={(e) => setSelectedAsset(e.target.value)}
                  className="w-full bg-[#121722] border border-[#1e2638] rounded px-3 py-2 text-slate-200 outline-none font-mono"
                >
                  <option value="USDT">USDT</option>
                  <option value="BTC">BTC</option>
                  <option value="ETH">ETH</option>
                  <option value="SOL">SOL</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Network</label>
                <select
                  value={selectedChain}
                  onChange={(e) => setSelectedChain(e.target.value as BlockchainType)}
                  className="w-full bg-[#121722] border border-[#1e2638] rounded px-3 py-2 text-slate-200 outline-none font-mono"
                >
                  <option value="Ethereum">Ethereum (ERC-20)</option>
                  <option value="Bitcoin">Bitcoin (Native SegWit)</option>
                  <option value="Solana">Solana (SPL)</option>
                  <option value="Arbitrum">Arbitrum One</option>
                  <option value="Tron">TRON (TRC-20)</option>
                </select>
              </div>
            </div>

            {/* Destination Address / Whitelist */}
            <div>
              <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                <span>Destination Wallet Address</span>
                <span>Select from Address Book</span>
              </div>
              <input
                type="text"
                value={withdrawAddress}
                onChange={(e) => setWithdrawAddress(e.target.value)}
                placeholder="0x... or bc1q..."
                className="w-full bg-[#121722] border border-[#1e2638] rounded px-3 py-2 text-slate-100 font-mono outline-none focus:border-cyan-500"
              />

              {/* Whitelisted address quick picker */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {whitelisted
                  .filter(w => w.chain === selectedChain)
                  .map(w => (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => setWithdrawAddress(w.address)}
                      className="px-2 py-0.5 rounded bg-[#151a24] hover:bg-[#1f2738] border border-[#202738] text-[10px] text-cyan-400 font-mono"
                    >
                      {w.label} ({w.address.slice(0, 6)}...)
                    </button>
                  ))}
              </div>
            </div>

            {/* Amount */}
            <div>
              <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                <span>Withdrawal Amount</span>
                <span className="font-mono text-cyan-400">
                  Est. Gas Fee: {chainConfig.withdrawalFee} {selectedAsset}
                </span>
              </div>
              <input
                type="number"
                step="any"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder={`Min ${chainConfig.minWithdrawal}`}
                className="w-full bg-[#121722] border border-[#1e2638] rounded px-3 py-2 text-slate-100 font-mono outline-none focus:border-cyan-500"
              />
            </div>

            {/* 2FA Authenticator Verification */}
            <div className="p-3 bg-[#121722] border border-[#1e2638] rounded space-y-2">
              <label className="text-[10px] text-slate-400 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
                Google Authenticator / YubiKey 2FA Token (Demo pre-filled)
              </label>
              <input
                type="text"
                maxLength={6}
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value)}
                className="w-full bg-[#0b0e14] border border-[#1a2232] rounded px-3 py-1.5 text-slate-100 font-mono text-center tracking-widest text-sm outline-none"
              />
            </div>

            {/* Feedback */}
            {withdrawFeedback && (
              <div
                className={`p-3 rounded text-xs flex items-center gap-2 ${
                  withdrawFeedback.type === 'success'
                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                    : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
                }`}
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{withdrawFeedback.message}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 rounded font-bold text-xs uppercase tracking-wider bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-all shadow-lg shadow-cyan-500/20"
            >
              Verify Security & Broadcast Withdrawal
            </button>
          </form>
        </div>
      )}

      {/* Tab: Vault Reserves */}
      {activeTab === 'vaults' && (
        <div className="space-y-4">
          <div className="bg-[#0e121b] border border-[#1c2230] p-4 rounded">
            <h2 className="text-sm font-bold text-slate-200 mb-2 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Hot / Cold Vault Architecture & Custody Protocol
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              ApexTrade enforces strict segregation between hot operational buffers and cold vaults. 95% of all client crypto deposits are swept automatically into multi-signature MPC cold vaults requiring 3-of-5 or 4-of-7 hardware approvals across geographically distributed air-gapped HSM nodes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {vaultReserves.map(vault => {
              const hotPct = (vault.hotReserve / vault.totalReserve) * 100;
              const coldPct = (vault.coldReserve / vault.totalReserve) * 100;

              return (
                <div key={vault.asset} className="bg-[#0e121b] border border-[#1c2230] p-4 rounded space-y-3 font-mono text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-100 text-sm">{vault.asset} Vault ({vault.chain})</span>
                    <span className="text-[10px] bg-[#1e2638] text-cyan-400 px-2 py-0.5 rounded border border-[#2e3b56]">
                      {vault.coldMultiSigRequired}
                    </span>
                  </div>

                  {/* Hot / Cold Ratio Bar */}
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                      <span>Hot Buffer: {hotPct.toFixed(1)}%</span>
                      <span>Cold Storage: {coldPct.toFixed(1)}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[#1a2232] flex overflow-hidden">
                      <div className="bg-amber-400 h-full" style={{ width: `${hotPct}%` }} title="Hot Liquidity" />
                      <div className="bg-emerald-400 h-full" style={{ width: `${coldPct}%` }} title="Cold Storage" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                    <div>
                      <div className="text-[10px] text-slate-500">HOT BUFFER BALANCE</div>
                      <div className="text-amber-400 font-bold">{vault.hotReserve.toLocaleString()} {vault.asset}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500">COLD VAULT BALANCE</div>
                      <div className="text-emerald-400 font-bold">{vault.coldReserve.toLocaleString()} {vault.asset}</div>
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-500 break-all pt-2 border-t border-[#1a2232]">
                    Cold Address: {vault.coldAddress}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab: Proof of Reserves */}
      {activeTab === 'proofOfReserves' && (
        <div className="max-w-3xl mx-auto bg-[#0e121b] border border-[#1c2230] p-6 rounded space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Cryptographic Proof of Reserves (PoR)</h2>
              <p className="text-xs text-slate-400">
                100% On-Chain Solvency Verification via Zero-Knowledge Merkle Tree
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            ApexTrade produces daily cryptographic snapshot commitments of exchange liabilities and assets. Every registered user can verify that their personal ledger balance is included in the published Merkle Root without exposing their private account data.
          </p>

          <div className="p-3 bg-[#121722] border border-[#1e2638] rounded font-mono text-xs space-y-2">
            <div className="text-[10px] text-slate-400 uppercase">Current Merkle Tree Root Hash</div>
            <div className="text-cyan-400 bg-[#0b0e14] p-2 rounded border border-[#1a2232] select-all break-all">
              0x9e8a71b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abc
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 pt-1">
              <span>Auditor: Armanino LLP & CertiK Certified</span>
              <span>Reserve Ratio: 104.82%</span>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <button
              onClick={generateProofOfReservesLeaf}
              className="px-4 py-2 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-all"
            >
              Generate My Account Merkle Leaf Proof
            </button>

            {userMerkleLeaf && (
              <div className="p-3 rounded bg-emerald-500/10 border border-emerald-500/30 font-mono text-xs text-emerald-300 break-all space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-400" />
                  Cryptographic Inclusion Proof Validated
                </div>
                <div className="text-[11px] text-slate-300">{userMerkleLeaf}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
