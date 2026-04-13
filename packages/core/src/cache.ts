import type { ZodObject, ZodRawShape } from "zod";

// ── Private helpers ─────────────────────────────────────────────────

interface CacheEntry<T> {
  value: T;
  timestamp: number;
}

function djb2Hash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

// ── Public API ──────────────────────────────────────────────────────

/** Interface for the LRU response cache returned by {@link createAICache}. */
export interface AICache<T> {
  /** Retrieve a cached value. Returns `undefined` if missing or expired. */
  get(key: string): T | undefined;
  /** Store a value in the cache. Evicts the least-recently-used entry if at capacity. */
  set(key: string, value: T): void;
  /** Check if a key exists and has not expired. */
  has(key: string): boolean;
  /** Remove a specific entry. Returns `true` if the entry existed. */
  delete(key: string): boolean;
  /** Remove all entries and reset stats. */
  clear(): void;
  /** Current number of entries (including potentially expired ones). */
  size(): number;
  /** Cache performance metrics. */
  stats(): { hits: number; misses: number; hitRate: number };
}

/**
 * Creates a lightweight LRU cache for AI responses with time-to-live expiration.
 * Uses a Map for O(1) lookups and insertion-order-based LRU eviction.
 *
 * @param options - Optional configuration for cache capacity and TTL.
 * @returns An AICache instance.
 */
export function createAICache<T>(options?: { maxSize?: number; ttl?: number }): AICache<T> {
  const maxSize = options?.maxSize ?? 100;
  const ttl = options?.ttl ?? 300_000;
  const map = new Map<string, CacheEntry<T>>();
  let hits = 0;
  let misses = 0;

  return {
    get(key) {
      const entry = map.get(key);
      if (!entry) {
        misses++;
        return undefined;
      }

      if (Date.now() - entry.timestamp > ttl) {
        map.delete(key);
        misses++;
        return undefined;
      }

      hits++;
      // Promote to most-recently-used by delete + re-set
      map.delete(key);
      map.set(key, entry);
      return entry.value;
    },

    set(key, value) {
      // Remove existing to update position
      map.delete(key);

      // Evict least-recently-used if at capacity
      if (map.size >= maxSize) {
        const oldestKey = map.keys().next().value;
        if (oldestKey !== undefined) {
          map.delete(oldestKey);
        }
      }

      map.set(key, { value, timestamp: Date.now() });
    },

    has(key) {
      const entry = map.get(key);
      if (!entry) return false;

      if (Date.now() - entry.timestamp > ttl) {
        map.delete(key);
        return false;
      }

      return true;
    },

    delete(key) {
      return map.delete(key);
    },

    clear() {
      map.clear();
      hits = 0;
      misses = 0;
    },

    size() {
      return map.size;
    },

    stats() {
      const total = hits + misses;
      return {
        hits,
        misses,
        hitRate: total === 0 ? 0 : hits / total,
      };
    },
  };
}

/**
 * Generates a deterministic cache key from a schema, context string, and optional field path.
 * The same schema shape and context always produce the same key, regardless of schema instance.
 *
 * @param input - The schema, context, and optional field path to hash.
 * @returns A compact alphanumeric cache key.
 */
export function createCacheKey(input: {
  schema: ZodObject<ZodRawShape>;
  context: string;
  fieldPath?: string;
}): string {
  const shape = input.schema.shape;
  const sortedKeys = Object.keys(shape).sort();
  const schemaString = sortedKeys
    .map((key) => {
      const fieldType = shape[key];
      const typeName = fieldType ? (fieldType._def as { typeName: string }).typeName : "unknown";
      return `${key}:${typeName}`;
    })
    .join("|");

  const raw = `${schemaString}|${input.context}|${input.fieldPath ?? ""}`;
  return djb2Hash(raw);
}
