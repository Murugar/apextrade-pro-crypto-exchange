import { BlockchainTx, BlockchainType } from '../types/crypto';

export interface ChainConfig {
  chain: BlockchainType;
  name: string;
  nativeAsset: string;
  depositAddress: string;
  requiredConfirmations: number;
  avgBlockTimeSec: number;
  minDeposit: number;
  minWithdrawal: number;
  withdrawalFee: number;
  explorerBaseUrl: string;
}

export class BlockchainService {
  private chainConfigs: Record<BlockchainType, ChainConfig> = {
    Bitcoin: {
      chain: 'Bitcoin',
      name: 'Bitcoin (BTC Native SegWit)',
      nativeAsset: 'BTC',
      depositAddress: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
      requiredConfirmations: 2,
      avgBlockTimeSec: 600,
      minDeposit: 0.0005,
      minWithdrawal: 0.001,
      withdrawalFee: 0.0002,
      explorerBaseUrl: 'https://mempool.space/tx',
    },
    Ethereum: {
      chain: 'Ethereum',
      name: 'Ethereum (ERC-20)',
      nativeAsset: 'ETH',
      depositAddress: '0x71C840A61B5b5bEfC38b0051189C623C62E69d1a',
      requiredConfirmations: 12,
      avgBlockTimeSec: 12,
      minDeposit: 0.005,
      minWithdrawal: 0.01,
      withdrawalFee: 0.002,
      explorerBaseUrl: 'https://etherscan.io/tx',
    },
    Solana: {
      chain: 'Solana',
      name: 'Solana (SPL)',
      nativeAsset: 'SOL',
      depositAddress: 'SolDep9xKu7qP2jE8Nm1aZ94vK1z9Yh3aQ2W9t7m1B8c',
      requiredConfirmations: 32,
      avgBlockTimeSec: 0.4,
      minDeposit: 0.05,
      minWithdrawal: 0.1,
      withdrawalFee: 0.005,
      explorerBaseUrl: 'https://solscan.io/tx',
    },
    Arbitrum: {
      chain: 'Arbitrum',
      name: 'Arbitrum One (L2 Rollup)',
      nativeAsset: 'ETH',
      depositAddress: '0x71C840A61B5b5bEfC38b0051189C623C62E69d1a',
      requiredConfirmations: 15,
      avgBlockTimeSec: 0.25,
      minDeposit: 0.002,
      minWithdrawal: 0.005,
      withdrawalFee: 0.0005,
      explorerBaseUrl: 'https://arbiscan.io/tx',
    },
    Tron: {
      chain: 'Tron',
      name: 'TRON (TRC-20)',
      nativeAsset: 'USDT',
      depositAddress: 'TXvQ7M6W9J1K3m8vTqPz1Yh2A8c3B9d4Ef',
      requiredConfirmations: 19,
      avgBlockTimeSec: 3,
      minDeposit: 10,
      minWithdrawal: 20,
      withdrawalFee: 1.5,
      explorerBaseUrl: 'https://tronscan.org/#/transaction',
    },
  };

  private activeTxs: BlockchainTx[] = [];
  private whitelistedAddresses: Array<{ id: string; label: string; address: string; chain: BlockchainType; addedAt: number }> = [
    {
      id: 'wl_1',
      label: 'Hardware Ledger Cold Storage',
      address: 'bc1q9x0c834h2k89sdf90234lksdf09234850sdfjk',
      chain: 'Bitcoin',
      addedAt: Date.now() - 86400000 * 5,
    },
    {
      id: 'wl_2',
      label: 'MetaMask Personal ETH',
      address: '0x32Be343B94f860124dC4fEe278FDCBD38C102D88',
      chain: 'Ethereum',
      addedAt: Date.now() - 86400000 * 3,
    },
    {
      id: 'wl_3',
      label: 'Phantom Solana Vault',
      address: 'Phan923jf8d01934kfn294018294jfksd82348123',
      chain: 'Solana',
      addedAt: Date.now() - 86400000 * 2,
    },
  ];

  constructor() {
    this.seedInitialTransactions();
  }

  private seedInitialTransactions() {
    this.activeTxs = [
      {
        id: 'tx_init_1',
        hash: '0x3b89c7482910fa8c3810294bdf893021894a8c90382910fb893c8a9201948123',
        chain: 'Ethereum',
        asset: 'USDT',
        type: 'DEPOSIT',
        amount: 50000.0,
        networkFee: 4.82,
        fromAddress: '0x8894e0a0c962cb723c1976a4421c95949be2d4e3',
        toAddress: this.chainConfigs.Ethereum.depositAddress,
        confirmations: 12,
        requiredConfirmations: 12,
        status: 'CONFIRMED',
        blockHeight: 21049281,
        timestamp: Date.now() - 3600000 * 2,
        explorerUrl: `${this.chainConfigs.Ethereum.explorerBaseUrl}/0x3b89c7482910fa8c3810294bdf893021894a8c90382910fb893c8a9201948123`,
      },
      {
        id: 'tx_init_2',
        hash: '8f0a9284bc910283c784910284c81029348102948c8910283948102938471029',
        chain: 'Bitcoin',
        asset: 'BTC',
        type: 'DEPOSIT',
        amount: 1.25,
        networkFee: 0.00015,
        fromAddress: 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4',
        toAddress: this.chainConfigs.Bitcoin.depositAddress,
        confirmations: 2,
        requiredConfirmations: 2,
        status: 'CONFIRMED',
        blockHeight: 864120,
        timestamp: Date.now() - 3600000 * 4,
        explorerUrl: `${this.chainConfigs.Bitcoin.explorerBaseUrl}/8f0a9284bc910283c784910284c81029348102948c8910283948102938471029`,
      },
    ];
  }

  public getChainConfig(chain: BlockchainType): ChainConfig {
    return this.chainConfigs[chain];
  }

  public getAllChainConfigs(): ChainConfig[] {
    return Object.values(this.chainConfigs);
  }

  public getTransactions(): BlockchainTx[] {
    return [...this.activeTxs];
  }

  public getWhitelistedAddresses() {
    return [...this.whitelistedAddresses];
  }

  public addWhitelistedAddress(label: string, address: string, chain: BlockchainType) {
    const entry = {
      id: `wl_${Date.now()}`,
      label,
      address,
      chain,
      addedAt: Date.now(),
    };
    this.whitelistedAddresses.push(entry);
    return entry;
  }

  /**
   * Simulate initiating an on-chain deposit.
   * Starts with 0 confirmations and progresses in real time.
   */
  public simulateIncomingDeposit(
    asset: string,
    chain: BlockchainType,
    amount: number,
    onConfirmed: (tx: BlockchainTx) => void,
    onProgress: (tx: BlockchainTx) => void
  ): BlockchainTx {
    const config = this.chainConfigs[chain];
    const hash = chain === 'Bitcoin'
      ? Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
      : `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;

    const newTx: BlockchainTx = {
      id: `tx_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      hash,
      chain,
      asset,
      type: 'DEPOSIT',
      amount,
      networkFee: config.withdrawalFee * 0.5,
      fromAddress: `0xExternalSender_${Math.floor(Math.random() * 10000)}`,
      toAddress: config.depositAddress,
      confirmations: 0,
      requiredConfirmations: config.requiredConfirmations,
      status: 'DETECTED',
      blockHeight: 21050000 + Math.floor(Math.random() * 500),
      timestamp: Date.now(),
      explorerUrl: `${config.explorerBaseUrl}/${hash}`,
    };

    this.activeTxs.unshift(newTx);

    // Simulate confirmation progression timer
    let currentConf = 0;
    const intervalTime = Math.max(600, Math.min(1800, (config.avgBlockTimeSec * 100) / config.requiredConfirmations));

    const timer = setInterval(() => {
      currentConf++;
      newTx.confirmations = currentConf;
      newTx.status = currentConf >= newTx.requiredConfirmations ? 'CONFIRMED' : 'CONFIRMING';
      newTx.blockHeight += 1;

      onProgress({ ...newTx });

      if (currentConf >= newTx.requiredConfirmations) {
        clearInterval(timer);
        onConfirmed(newTx);
      }
    }, intervalTime);

    return newTx;
  }

  /**
   * Broadcast an approved withdrawal to the blockchain
   */
  public broadcastWithdrawal(
    asset: string,
    chain: BlockchainType,
    amount: number,
    toAddress: string
  ): BlockchainTx {
    const config = this.chainConfigs[chain];
    const hash = chain === 'Bitcoin'
      ? Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
      : `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;

    const tx: BlockchainTx = {
      id: `tx_w_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      hash,
      chain,
      asset,
      type: 'WITHDRAW',
      amount,
      networkFee: config.withdrawalFee,
      fromAddress: config.depositAddress, // hot vault address
      toAddress,
      confirmations: 1,
      requiredConfirmations: config.requiredConfirmations,
      status: 'CONFIRMING',
      blockHeight: 21050120,
      timestamp: Date.now(),
      explorerUrl: `${config.explorerBaseUrl}/${hash}`,
    };

    this.activeTxs.unshift(tx);
    return tx;
  }
}
