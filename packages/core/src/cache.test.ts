import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { createAICache, createCacheKey } from "./cache";

describe("createAICache", () => {
  describe("basic CRUD", () => {
    it("set then get returns the value", () => {
      const cache = createAICache<string>();
      cache.set("key1", "value1");
      expect(cache.get("key1")).toBe("value1");
    });

    it("get returns undefined for missing key", () => {
      const cache = createAICache<string>();
      expect(cache.get("missing")).toBeUndefined();
    });

    it("has returns true for existing key", () => {
      const cache = createAICache<string>();
      cache.set("key1", "value1");
      expect(cache.has("key1")).toBe(true);
    });

    it("has returns false for missing key", () => {
      const cache = createAICache<string>();
      expect(cache.has("missing")).toBe(false);
    });

    it("delete removes an entry", () => {
      const cache = createAICache<string>();
      cache.set("key1", "value1");
      expect(cache.delete("key1")).toBe(true);
      expect(cache.get("key1")).toBeUndefined();
    });

    it("delete returns false for missing key", () => {
      const cache = createAICache<string>();
      expect(cache.delete("missing")).toBe(false);
    });

    it("clear empties the cache", () => {
      const cache = createAICache<string>();
      cache.set("a", "1");
      cache.set("b", "2");
      cache.clear();
      expect(cache.size()).toBe(0);
    });

    it("size reflects current entry count", () => {
      const cache = createAICache<string>();
      expect(cache.size()).toBe(0);
      cache.set("a", "1");
      expect(cache.size()).toBe(1);
      cache.set("b", "2");
      expect(cache.size()).toBe(2);
    });
  });

  describe("LRU eviction", () => {
    it("evicts the oldest entry when maxSize is reached", () => {
      const cache = createAICache<string>({ maxSize: 3 });
      cache.set("a", "1");
      cache.set("b", "2");
      cache.set("c", "3");
      cache.set("d", "4"); // should evict "a"

      expect(cache.get("a")).toBeUndefined();
      expect(cache.get("b")).toBe("2");
      expect(cache.get("d")).toBe("4");
      expect(cache.size()).toBe(3);
    });

    it("accessing an entry promotes it and prevents eviction", () => {
      const cache = createAICache<string>({ maxSize: 3 });
      cache.set("a", "1");
      cache.set("b", "2");
      cache.set("c", "3");

      cache.get("a"); // promote "a" to most recent
      cache.set("d", "4"); // should evict "b" (now oldest)

      expect(cache.get("a")).toBe("1");
      expect(cache.get("b")).toBeUndefined();
    });

    it("updating an existing key does not increase size", () => {
      const cache = createAICache<string>({ maxSize: 3 });
      cache.set("a", "1");
      cache.set("b", "2");
      cache.set("a", "updated");

      expect(cache.size()).toBe(2);
      expect(cache.get("a")).toBe("updated");
    });
  });

  describe("TTL expiration", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("returns undefined for expired entries", () => {
      const cache = createAICache<string>({ ttl: 1000 });
      cache.set("key1", "value1");

      vi.advanceTimersByTime(1001);
      expect(cache.get("key1")).toBeUndefined();
    });

    it("returns value for non-expired entries", () => {
      const cache = createAICache<string>({ ttl: 1000 });
      cache.set("key1", "value1");

      vi.advanceTimersByTime(500);
      expect(cache.get("key1")).toBe("value1");
    });

    it("has returns false for expired entries", () => {
      const cache = createAICache<string>({ ttl: 1000 });
      cache.set("key1", "value1");

      vi.advanceTimersByTime(1001);
      expect(cache.has("key1")).toBe(false);
    });
  });

  describe("stats", () => {
    it("starts at zero", () => {
      const cache = createAICache<string>();
      expect(cache.stats()).toEqual({ hits: 0, misses: 0, hitRate: 0 });
    });

    it("tracks hits on successful get", () => {
      const cache = createAICache<string>();
      cache.set("a", "1");
      cache.get("a");
      expect(cache.stats().hits).toBe(1);
    });

    it("tracks misses on failed get", () => {
      const cache = createAICache<string>();
      cache.get("missing");
      expect(cache.stats().misses).toBe(1);
    });

    it("tracks misses on expired get", () => {
      vi.useFakeTimers();
      const cache = createAICache<string>({ ttl: 100 });
      cache.set("a", "1");
      vi.advanceTimersByTime(101);
      cache.get("a");
      expect(cache.stats().misses).toBe(1);
      vi.useRealTimers();
    });

    it("computes hitRate correctly", () => {
      const cache = createAICache<string>();
      cache.set("a", "1");
      cache.get("a"); // hit
      cache.get("b"); // miss
      expect(cache.stats().hitRate).toBe(0.5);
    });

    it("clear resets stats", () => {
      const cache = createAICache<string>();
      cache.set("a", "1");
      cache.get("a");
      cache.get("b");
      cache.clear();
      expect(cache.stats()).toEqual({ hits: 0, misses: 0, hitRate: 0 });
    });
  });
});

describe("createCacheKey", () => {
  it("produces the same key for the same inputs", () => {
    const schema = z.object({ name: z.string(), age: z.number() });
    const key1 = createCacheKey({ schema, context: "fill form" });
    const key2 = createCacheKey({ schema, context: "fill form" });
    expect(key1).toBe(key2);
  });

  it("produces the same key for equivalent schema instances", () => {
    const schema1 = z.object({ name: z.string(), age: z.number() });
    const schema2 = z.object({ name: z.string(), age: z.number() });
    const key1 = createCacheKey({ schema: schema1, context: "ctx" });
    const key2 = createCacheKey({ schema: schema2, context: "ctx" });
    expect(key1).toBe(key2);
  });

  it("produces different keys for different schemas", () => {
    const schema1 = z.object({ name: z.string() });
    const schema2 = z.object({ email: z.string() });
    const key1 = createCacheKey({ schema: schema1, context: "ctx" });
    const key2 = createCacheKey({ schema: schema2, context: "ctx" });
    expect(key1).not.toBe(key2);
  });

  it("produces different keys for different contexts", () => {
    const schema = z.object({ name: z.string() });
    const key1 = createCacheKey({ schema, context: "context A" });
    const key2 = createCacheKey({ schema, context: "context B" });
    expect(key1).not.toBe(key2);
  });

  it("produces different keys with and without fieldPath", () => {
    const schema = z.object({ name: z.string() });
    const key1 = createCacheKey({ schema, context: "ctx" });
    const key2 = createCacheKey({ schema, context: "ctx", fieldPath: "name" });
    expect(key1).not.toBe(key2);
  });
});
