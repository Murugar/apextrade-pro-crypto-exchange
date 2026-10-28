import React, { useState } from 'react';
import { Network, Server, Cpu, Layers, Database, Shield, Zap, RefreshCw, HardDrive, Globe } from 'lucide-react';

interface ArchNode {
  id: string;
  name: string;
  role: string;
  latencySla: string;
  throughput: string;
  techStack: string;
  haProtocol: string;
  details: string;
  icon: React.ReactNode;
}

export const ArchitectureView: React.FC = () => {
  const [selectedNodeId, setSelectedNodeId] = useState<string>('matching');

  const nodes: ArchNode[] = [
    {
      id: 'edge',
      name: 'Global Anycast Edge & DDoS Shield',
      role: 'BGP Anycast + Layer 3/4 SYN Flood Scrubbing',
      latencySla: '< 5 ms (Edge PoP)',
      throughput: '100+ Gbps Scrubbing Capacity',
      techStack: 'Cloudflare Magic Transit, eBPF / XDP Kernel Filter',
      haProtocol: 'Anycast automated routing, multi-datacenter failover without DNS TTL delays',
      details: 'All incoming HTTP, WebSocket, and FIX traffic hits geographically distributed edge nodes. XDP eBPF filters drop spoofed SYN and UDP floods in the kernel space before reaching the application layer.',
      icon: <Globe className="w-5 h-5 text-cyan-400" />,
    },
    {
      id: 'gateway',
      name: 'API Gateway & Token Bucket Proxy',
      role: 'Reverse Proxy, TLS 1.3 Termination, Rate Limiting',
      latencySla: '< 150 µs',
      throughput: '1,200,000 req/sec',
      techStack: 'Envoy Proxy, C++, Redis Cluster (for distributed leaky-bucket tokens)',
      haProtocol: 'Stateless Kubernetes DaemonSet behind AWS NLB with active-active health checks',
      details: 'Terminates client TLS connections, validates IP whitelists, applies leaky-bucket token quotas, and routes REST/WS requests to internal gRPC microservices via HTTP/2 multiplexing.',
      icon: <Server className="w-5 h-5 text-emerald-400" />,
    },
    {
      id: 'auth',
      name: 'Signature & Auth Verifier',
      role: 'HMAC-SHA256 & Ed25519 Cryptographic Verification',
      latencySla: '< 45 µs',
      throughput: '800,000 checks/sec',
      techStack: 'Rust, libsodium, Zero-copy memory architecture',
      haProtocol: 'Stateless auto-scaling worker pool with memory-mapped API key lookups',
      details: 'Verifies client request signatures, nonces, and timestamps to eliminate replay attacks. Memory-mapped LMDB database holds active API keys with zero heap allocations.',
      icon: <Shield className="w-5 h-5 text-purple-400" />,
    },
    {
      id: 'wal',
      name: 'Order Sequencer & Write-Ahead Log (WAL)',
      role: 'Deterministic Event Sourcing & Total Order Broadcast',
      latencySla: '< 20 µs',
      throughput: '1,500,000 events/sec',
      techStack: 'Apache Kafka / Raft Consensus, NVMe Direct I/O',
      haProtocol: '3-node Raft consensus cluster with fsync batches for crash recovery guarantee',
      details: 'Assigns monotonic sequence IDs (1, 2, 3...) to all incoming orders. If the matching engine node crashes, it can replay the deterministic WAL from the last snapshot in &lt; 800ms.',
      icon: <HardDrive className="w-5 h-5 text-amber-400" />,
    },
    {
      id: 'matching',
      name: 'Matching Engine Cluster (LMAX Disruptor)',
      role: 'In-Memory Price-Time Priority FIFO Execution',
      latencySla: '< 38 µs (Deterministic)',
      throughput: '650,000 orders/sec per symbol shard',
      techStack: 'C++20 / Rust, Cache-aligned ring buffers, NUMA pin, Zero GC',
      haProtocol: 'Hot-Standby replica receiving replicated WAL ticks with sub-millisecond shadow state',
      details: 'Each symbol (e.g. BTC/USDT) runs on a dedicated dedicated CPU core isolated via isolcpus. High-performance lock-free ring buffers eliminate thread contention. Trades and order book updates are published immediately to downstream ledger and WS broadcasters.',
      icon: <Cpu className="w-5 h-5 text-cyan-400" />,
    },
    {
      id: 'ledger',
      name: 'Double-Entry Ledger & Clearing Engine',
      role: 'Atomic Balance Movements, Fee Revenue Settlement',
      latencySla: '< 120 µs',
      throughput: '500,000 journal entries/sec',
      techStack: 'PostgreSQL partitioned tables, RocksDB in-memory journal cache, Golang',
      haProtocol: 'Synchronous replication with 2-phase commit clearing invariants',
      details: 'Maintains immutable double-entry accounting. Unlocks base and quote balances upon matching engine fill events. Computes real-time Merkle tree snapshots for Proof of Reserves audits.',
      icon: <Database className="w-5 h-5 text-teal-400" />,
    },
    {
      id: 'fanout',
      name: 'Market Data WebSocket Fan-Out Service',
      role: 'Low-Latency Public & Private Pub/Sub Streams',
      latencySla: '< 5 ms globally',
      throughput: '5,000,000 concurrent client connections',
      techStack: 'uWebSockets (C++), epoll socket multiplexing, Redis Pub/Sub',
      haProtocol: 'Edge fan-out cluster distributed across 12 global AWS/GCP regions',
      details: 'Consumes trade and depth events from the matching engine and broadcasts delta updates over binary WebSockets and JSON streams to retail terminals and institutional algo clients.',
      icon: <Zap className="w-5 h-5 text-amber-400" />,
    },
    {
      id: 'custody',
      name: 'MPC Cold Vault & Blockchain Custody Relayer',
      role: 'Multi-Chain Deposit Monitoring & Multi-Sig Sweeping',
      latencySla: 'Asynchronous On-Chain Times',
      throughput: '10,000 on-chain tx/day',
      techStack: 'Fireblocks MPC-CMP, Hardware Security Modules (FIPS 140-3 Level 4)',
      haProtocol: 'Geographically dispersed 3-of-5 and 4-of-7 quorum signers with air-gapped backup',
      details: 'Continuously listens to blockchain mempools and newly confirmed blocks across Bitcoin, Ethereum, Solana, and Arbitrum. Enforces automatic hot-to-cold threshold sweeps when hot reserves exceed 5%.',
      icon: <Layers className="w-5 h-5 text-rose-400" />,
    },
  ];

  const selectedNode = nodes.find(n => n.id === selectedNodeId) || nodes[0];

  return (
    <div className="flex-1 bg-[#0b0e14] p-4 flex flex-col overflow-y-auto space-y-4">
      {/* Header */}
      <div className="border-b border-[#1c2230] pb-4">
        <h1 className="text-lg font-bold text-slate-100 flex items-center gap-2">
          <Network className="w-5 h-5 text-cyan-400" />
          Distributed Microservices & Matching Engine Infrastructure
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Fault-Tolerant Event-Sourced Architecture · LMAX Disruptor FIFO · Microsecond Latency Budgets
        </p>
      </div>

      {/* Interactive Topology Diagram */}
      <div className="bg-[#0e121b] border border-[#1c2230] p-4 rounded space-y-4">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="font-bold text-slate-200 uppercase">Interactive Service Mesh Topology</span>
          <span className="text-[10px] text-cyan-400">Click any service component to inspect SLA & HA model</span>
        </div>

        {/* Visual Pipeline Flow */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {nodes.map(node => {
            const isSelected = selectedNodeId === node.id;
            return (
              <div
                key={node.id}
                onClick={() => setSelectedNodeId(node.id)}
                className={`p-3.5 rounded border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-[#182030] border-cyan-400 shadow-lg shadow-cyan-500/10'
                    : 'bg-[#121722] border-[#1e2638] hover:border-[#2e3b56]'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="p-1.5 rounded bg-[#0b0e14] border border-[#1a2232]">
                    {node.icon}
                  </div>
                  <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/40 px-1.5 py-0.5 rounded border border-cyan-800/40">
                    {node.latencySla}
                  </span>
                </div>
                <div className="font-bold text-slate-100 text-xs">{node.name}</div>
                <div className="text-[10px] text-slate-400 font-sans mt-1 line-clamp-2">{node.role}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Component Deep Dive */}
      <div className="bg-[#0e121b] border border-[#1c2230] p-5 rounded space-y-4 font-mono text-xs">
        <div className="flex items-center justify-between border-b border-[#1c2230] pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded bg-[#121722] border border-[#1e2638]">
              {selectedNode.icon}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">{selectedNode.name}</h2>
              <p className="text-xs text-cyan-400">{selectedNode.role}</p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/30">
            HEALTH: 100% NOMINAL
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#121722] p-3 rounded border border-[#1e2638]">
            <div className="text-[10px] text-slate-500 uppercase">Latency SLA Budget</div>
            <div className="text-sm font-bold text-cyan-400 mt-1">{selectedNode.latencySla}</div>
          </div>

          <div className="bg-[#121722] p-3 rounded border border-[#1e2638]">
            <div className="text-[10px] text-slate-500 uppercase">Throughput Capacity</div>
            <div className="text-sm font-bold text-emerald-400 mt-1">{selectedNode.throughput}</div>
          </div>

          <div className="bg-[#121722] p-3 rounded border border-[#1e2638]">
            <div className="text-[10px] text-slate-500 uppercase">Tech Stack & Framework</div>
            <div className="text-sm font-bold text-slate-200 mt-1">{selectedNode.techStack}</div>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          <div>
            <div className="text-[11px] text-slate-400 uppercase font-bold mb-1">Architecture & Data Flow:</div>
            <p className="text-xs text-slate-300 font-sans leading-relaxed bg-[#121722] p-3 rounded border border-[#1e2638]">
              {selectedNode.details}
            </p>
          </div>

          <div>
            <div className="text-[11px] text-slate-400 uppercase font-bold mb-1">Fault-Tolerance & Failover Strategy:</div>
            <p className="text-xs text-emerald-300 font-sans leading-relaxed bg-emerald-950/20 p-3 rounded border border-emerald-800/40">
              {selectedNode.haProtocol}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
