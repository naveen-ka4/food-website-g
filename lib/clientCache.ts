/**
 * Lightweight in-memory Client-Side Cache
 * - Prevents repetitive network roundtrips when navigating between tabs/pages
 * - Supports automatic expiration (TTL) and instant cache clearance on mutations
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const clientMemoryStore = new Map<string, CacheEntry<any>>();

/**
 * Get cached client data if within maxAgeMs (default 60 seconds)
 */
export function getClientCached<T>(key: string, maxAgeMs = 60_000): T | null {
  const entry = clientMemoryStore.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > maxAgeMs) {
    clientMemoryStore.delete(key);
    return null;
  }
  return entry.data as T;
}

/**
 * Set client data into memory cache
 */
export function setClientCached<T>(key: string, data: T): void {
  clientMemoryStore.set(key, { data, timestamp: Date.now() });
}

/**
 * Clear cached entries by prefix (or clear all if no prefix passed)
 */
export function clearClientCache(prefix?: string): void {
  if (!prefix) {
    clientMemoryStore.clear();
    return;
  }
  for (const key of clientMemoryStore.keys()) {
    if (key.startsWith(prefix)) {
      clientMemoryStore.delete(key);
    }
  }
}

