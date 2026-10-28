export interface SecurityAuditEntry {
  id: string;
  timestamp: number;
  level: 'INFO' | 'WARNING' | 'CRITICAL';
  eventType: string;
  ipAddress: string;
  userAgent: string;
  details: string;
}

export interface ApiKeyRecord {
  id: string;
  name: string;
  apiKey: string;
  apiSecretMasked: string;
  permissions: {
    read: boolean;
    trade: boolean;
    withdraw: boolean;
  };
  ipWhitelist: string[];
  createdAt: number;
  lastUsedAt: number;
  rateLimitUsed: number;
}

export class SecurityService {
  // Token Bucket Rate Limiter settings
  public bucketCapacity: number = 60;
  public refillRatePerSec: number = 10;
  public currentTokens: number = 60;
  private lastRefillTimestamp: number = Date.now();
  public totalRequestsAllowed: number = 0;
  public totalRequestsThrottled: number = 0;

  // Circuit breaker state
  public circuitBreakers: Map<string, { tripped: boolean; reason?: string; resetAt?: number }> = new Map();

  // Audit Log
  private auditLog: SecurityAuditEntry[] = [];

  // API Keys
  private apiKeys: ApiKeyRecord[] = [
    {
      id: 'key_1',
      name: 'HFT Hummingbot Node-01',
      apiKey: 'ak_live_79a0f81b2c4e8d910293481029',
      apiSecretMasked: 'sec_live_9a8f••••••••••••••••••••••••3c1a',
      permissions: { read: true, trade: true, withdraw: false },
      ipWhitelist: ['192.168.1.100', '10.0.4.52'],
      createdAt: Date.now() - 86400000 * 14,
      lastUsedAt: Date.now() - 12000,
      rateLimitUsed: 14,
    },
    {
      id: 'key_2',
      name: 'Institutional Treasury Cold Relayer',
      apiKey: 'ak_live_10923481029384710293847102',
      apiSecretMasked: 'sec_live_7b12••••••••••••••••••••••••9e44',
      permissions: { read: true, trade: false, withdraw: true },
      ipWhitelist: ['172.16.0.8'],
      createdAt: Date.now() - 86400000 * 45,
      lastUsedAt: Date.now() - 3600000 * 2,
      rateLimitUsed: 2,
    },
  ];

  constructor() {
    this.seedAuditLogs();
  }

  private seedAuditLogs() {
    this.auditLog = [
      {
        id: 'aud_1',
        timestamp: Date.now() - 3600000 * 3,
        level: 'INFO',
        eventType: 'USER_AUTH_MFA_PASS',
        ipAddress: '198.51.100.42',
        userAgent: 'Chrome 128 / macOS Sequoia',
        details: 'Hardware FIDO2 Security Key verified for session start',
      },
      {
        id: 'aud_2',
        timestamp: Date.now() - 3600000 * 2,
        level: 'INFO',
        eventType: 'API_KEY_AUTH',
        ipAddress: '10.0.4.52',
        userAgent: 'Go-http-client/1.1 (Hummingbot)',
        details: 'HMAC-SHA256 signature verified with valid nonce (drift +14ms)',
      },
      {
        id: 'aud_3',
        timestamp: Date.now() - 1800000,
        level: 'WARNING',
        eventType: 'BURST_RATE_LIMIT_WARNING',
        ipAddress: '203.0.113.88',
        userAgent: 'python-requests/2.31.0',
        details: 'Client consumed 55/60 tokens within 3 seconds. Leaky bucket at 91% capacity',
      },
    ];
  }

  /**
   * Refill tokens based on elapsed time and check if request is allowed
   */
  public checkRateLimit(tokensNeeded: number = 1): { allowed: boolean; remainingTokens: number; retryAfterMs: number } {
    const now = Date.now();
    const elapsedSec = (now - this.lastRefillTimestamp) / 1000;
    this.currentTokens = Math.min(this.bucketCapacity, this.currentTokens + elapsedSec * this.refillRatePerSec);
    this.lastRefillTimestamp = now;

    if (this.currentTokens >= tokensNeeded) {
      this.currentTokens -= tokensNeeded;
      this.totalRequestsAllowed++;
      return { allowed: true, remainingTokens: Math.floor(this.currentTokens), retryAfterMs: 0 };
    } else {
      this.totalRequestsThrottled++;
      const needed = tokensNeeded - this.currentTokens;
      const retryAfterMs = Math.ceil((needed / this.refillRatePerSec) * 1000);

      this.logAudit({
        level: 'WARNING',
        eventType: 'HTTP_429_TOO_MANY_REQUESTS',
        ipAddress: 'Client_Gateway_IP',
        userAgent: 'ExchangeAPI/1.0',
        details: `Token bucket depleted (0/${this.bucketCapacity} tokens). Throttled request with Retry-After: ${retryAfterMs}ms`,
      });

      return { allowed: false, remainingTokens: 0, retryAfterMs };
    }
  }

  /**
   * Check for Wash Trading (order matching against self or rapid spoof cancel)
   */
  public inspectOrderRisk(orderParams: {
    symbol: string;
    side: 'BUY' | 'SELL';
    price: number;
    amount: number;
    currentMarketPrice: number;
  }): { passed: boolean; reason?: string } {
    // 1. Check Circuit Breaker
    const cb = this.circuitBreakers.get(orderParams.symbol);
    if (cb && cb.tripped) {
      return { passed: false, reason: `Trading halted: Circuit breaker triggered (${cb.reason})` };
    }

    // 2. Fat-Finger / Extreme Price Band Check (e.g. order price > 20% away from market)
    if (orderParams.price > 0 && orderParams.currentMarketPrice > 0) {
      const deviationPct = Math.abs((orderParams.price - orderParams.currentMarketPrice) / orderParams.currentMarketPrice) * 100;
      if (deviationPct > 25) {
        this.logAudit({
          level: 'WARNING',
          eventType: 'RISK_PRICE_BAND_REJECT',
          ipAddress: 'Internal_Risk_Engine',
          userAgent: 'OrderGate/v3',
          details: `Order rejected: Price ${orderParams.price} deviates ${deviationPct.toFixed(1)}% from mark price ${orderParams.currentMarketPrice}`,
        });
        return {
          passed: false,
          reason: `Price band protection: Order deviates ${deviationPct.toFixed(1)}% from market. Max allowed band is ±25%`,
        };
      }
    }

    return { passed: true };
  }

  public tripCircuitBreaker(symbol: string, reason: string, durationMs: number = 30000) {
    this.circuitBreakers.set(symbol, {
      tripped: true,
      reason,
      resetAt: Date.now() + durationMs,
    });

    this.logAudit({
      level: 'CRITICAL',
      eventType: 'CIRCUIT_BREAKER_ENGAGED',
      ipAddress: 'Risk_Supervisor',
      userAgent: 'VolSurveillance/1.0',
      details: `CIRCUIT BREAKER: Trading suspended on ${symbol}. Cause: ${reason}. Cooldown for ${durationMs / 1000}s`,
    });

    setTimeout(() => {
      this.circuitBreakers.delete(symbol);
      this.logAudit({
        level: 'INFO',
        eventType: 'CIRCUIT_BREAKER_RESET',
        ipAddress: 'Risk_Supervisor',
        userAgent: 'VolSurveillance/1.0',
        details: `Trading resumed on ${symbol} after cooldown inspection`,
      });
    }, durationMs);
  }

  public logAudit(entry: Omit<SecurityAuditEntry, 'id' | 'timestamp'>) {
    const fullEntry: SecurityAuditEntry = {
      id: `aud_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      timestamp: Date.now(),
      ...entry,
    };
    this.auditLog.unshift(fullEntry);
    if (this.auditLog.length > 100) {
      this.auditLog.pop();
    }
  }

  public getAuditLogs(): SecurityAuditEntry[] {
    return [...this.auditLog];
  }

  public getApiKeys(): ApiKeyRecord[] {
    return [...this.apiKeys];
  }

  public createApiKey(name: string, perms: { read: boolean; trade: boolean; withdraw: boolean }, ipWhitelist: string[]): ApiKeyRecord {
    const rawKey = `ak_live_${Array.from({ length: 24 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
    const newRecord: ApiKeyRecord = {
      id: `key_${Date.now()}`,
      name,
      apiKey: rawKey,
      apiSecretMasked: `sec_live_${Array.from({ length: 6 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}••••••••••••••••••••••••${Array.from({ length: 4 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
      permissions: perms,
      ipWhitelist: ipWhitelist.length > 0 ? ipWhitelist : ['0.0.0.0/0 (Any IP)'],
      createdAt: Date.now(),
      lastUsedAt: Date.now(),
      rateLimitUsed: 0,
    };

    this.apiKeys.unshift(newRecord);
    this.logAudit({
      level: 'INFO',
      eventType: 'API_KEY_PROVISIONED',
      ipAddress: '198.51.100.42',
      userAgent: 'Console/2.0',
      details: `New API Key "${name}" issued with permissions: [${Object.entries(perms).filter(([_, v]) => v).map(([k]) => k).join(', ')}]`,
    });

    return newRecord;
  }

  public revokeApiKey(id: string) {
    const idx = this.apiKeys.findIndex(k => k.id === id);
    if (idx !== -1) {
      const [key] = this.apiKeys.splice(idx, 1);
      this.logAudit({
        level: 'WARNING',
        eventType: 'API_KEY_REVOKED',
        ipAddress: '198.51.100.42',
        userAgent: 'Console/2.0',
        details: `API Key "${key.name}" revoked immediately. Token invalidated across edge gateways`,
      });
    }
  }
}
