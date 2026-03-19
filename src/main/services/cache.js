export class TtlCache {
  constructor(defaultTtlMs = 10000) {
    this.defaultTtlMs = defaultTtlMs;
    this.store = new Map();
  }

  set(key, value, ttlMs = this.defaultTtlMs) {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs
    });
  }

  get(key) {
    const item = this.store.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return item.value;
  }

  prune() {
    const now = Date.now();
    for (const [key, value] of this.store.entries()) {
      if (now > value.expiresAt) this.store.delete(key);
    }
  }
}

export class SlidingWindowRateLimiter {
  constructor(maxRequests, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.timestamps = [];
  }

  consume() {
    const now = Date.now();
    this.timestamps = this.timestamps.filter((ts) => now - ts <= this.windowMs);
    if (this.timestamps.length >= this.maxRequests) return false;
    this.timestamps.push(now);
    return true;
  }
}
