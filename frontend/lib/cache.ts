// lib/cache.ts
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class Cache<T = any> {
  private cache = new Map<string, CacheEntry<T>>();
  private duration: number;

  constructor(durationMs: number = 5 * 60 * 1000) {
    this.duration = durationMs;
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.duration) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  set(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  clear(): void {
    this.cache.clear();
  }
}

export const neynarUserCache = new Cache<any>(5 * 60 * 1000); // 5 minutes