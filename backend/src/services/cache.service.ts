import NodeCache from 'node-cache';

class CacheService {
  private cache: NodeCache;

  constructor(ttlSeconds: number = 3600) {
    this.cache = new NodeCache({
      stdTTL: ttlSeconds,
      checkperiod: ttlSeconds * 0.2,
      useClones: false
    });
  }

  async get<T>(key: string, storeFunction: () => Promise<T>): Promise<T> {
    const value = this.cache.get<T>(key);
    if (value) {
      return value;
    }

    const result = await storeFunction();
    this.cache.set(key, result);
    return result;
  }

  del(keys: string | string[]): void {
    this.cache.del(keys);
  }

  flush(): void {
    this.cache.flushAll();
  }
}

export const cacheService = new CacheService(21600); // 6 horas por defecto
