import type { ZodObject, ZodRawShape } from "zod";
import type { AIFieldUpdate } from "./types";

/**
 * Recursively makes all properties in T optional.
 * Arrays are not recursed into — they are treated as single units.
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends (infer U)[]
    ? (U | undefined)[]
    : T[P] extends object
      ? DeepPartial<T[P]>
      : T[P];
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...target };
  for (const key of Object.keys(source)) {
    const sourceVal = source[key];
    const targetVal = result[key];
    if (isPlainObject(sourceVal) && isPlainObject(targetVal)) {
      result[key] = deepMerge(targetVal, sourceVal);
    } else {
      result[key] = sourceVal;
    }
  }
  return result;
}

function getAllLeafPaths(obj: Record<string, unknown>, prefix: string): string[] {
  const paths: string[] = [];
  for (const key of Object.keys(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];
    if (isPlainObject(value)) {
      paths.push(...getAllLeafPaths(value, path));
    } else {
      paths.push(path);
    }
  }
  return paths;
}

function getValueAtPath(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (!isPlainObject(current)) return undefined;
    current = current[part];
  }
  return current;
}

/**
 * Compares two partial objects and returns an array of field updates
 * for every field that changed between them. Nested objects are
 * compared recursively using dot-notation paths.
 *
 * @param prev - The previous partial object state.
 * @param next - The new partial object state.
 * @param pathPrefix - Optional path prefix for nested recursion.
 * @returns An array of AIFieldUpdate entries for changed fields.
 */
export function diffPartialObjects(
  prev: Record<string, unknown>,
  next: Record<string, unknown>,
  pathPrefix?: string,
): AIFieldUpdate[] {
  const updates: AIFieldUpdate[] = [];
  const now = Date.now();

  for (const key of Object.keys(next)) {
    const fieldPath = pathPrefix ? `${pathPrefix}.${key}` : key;
    const nextVal = next[key];
    const prevVal = prev[key];

    if (nextVal === undefined) continue;

    if (isPlainObject(nextVal)) {
      const prevObj = isPlainObject(prevVal) ? prevVal : {};
      updates.push(...diffPartialObjects(prevObj, nextVal, fieldPath));
    } else if (Array.isArray(nextVal)) {
      if (JSON.stringify(prevVal) !== JSON.stringify(nextVal)) {
        updates.push({
          fieldPath,
          value: nextVal,
          previousValue: prevVal ?? null,
          isComplete: false,
          timestamp: now,
        });
      }
    } else {
      if (prevVal !== nextVal) {
        updates.push({
          fieldPath,
          value: nextVal,
          previousValue: prevVal ?? null,
          isComplete: false,
          timestamp: now,
        });
      }
    }
  }

  return updates;
}

/** The stateful field router returned by {@link createFieldRouter}. */
export interface FieldRouter<T> {
  /** Feed a new partial object snapshot from the stream. Returns the field updates that were emitted. */
  update(partialObject: DeepPartial<T>): AIFieldUpdate[];
  /** Subscribe to updates for a specific field path. Returns an unsubscribe function. */
  subscribe(fieldPath: string, callback: (update: AIFieldUpdate) => void): () => void;
  /** Subscribe to all field updates. Returns an unsubscribe function. */
  subscribeAll(callback: (update: AIFieldUpdate) => void): () => void;
  /** Returns a deep clone of the current accumulated state. */
  getSnapshot(): DeepPartial<T>;
  /** Clears all accumulated state. Subscriptions are preserved. */
  reset(): void;
  /** Marks all current fields as complete and fires final updates. */
  complete(): void;
}

/**
 * Creates a stateful field router that tracks streaming partial object
 * snapshots and emits targeted per-field update events.
 *
 * @param _schema - A Zod object schema (used for type inference only).
 * @returns A FieldRouter instance for managing streaming field updates.
 */
export function createFieldRouter<T extends ZodObject<ZodRawShape>>(
  _schema: T,
): FieldRouter<T["_output"]> {
  let snapshot: Record<string, unknown> = {};
  const fieldSubscribers = new Map<string, Set<(update: AIFieldUpdate) => void>>();
  const allSubscribers = new Set<(update: AIFieldUpdate) => void>();

  function notify(updates: AIFieldUpdate[]): void {
    for (const update of updates) {
      const subs = fieldSubscribers.get(update.fieldPath);
      if (subs) {
        for (const cb of subs) cb(update);
      }
      for (const cb of allSubscribers) cb(update);
    }
  }

  return {
    update(partialObject) {
      const incoming = partialObject as Record<string, unknown>;
      const oldSnapshot = snapshot;
      snapshot = deepMerge(snapshot, incoming);
      const updates = diffPartialObjects(oldSnapshot, snapshot);
      notify(updates);
      return updates;
    },

    subscribe(fieldPath, callback) {
      let subs = fieldSubscribers.get(fieldPath);
      if (!subs) {
        subs = new Set();
        fieldSubscribers.set(fieldPath, subs);
      }
      subs.add(callback);
      return () => {
        subs.delete(callback);
        if (subs.size === 0) {
          fieldSubscribers.delete(fieldPath);
        }
      };
    },

    subscribeAll(callback) {
      allSubscribers.add(callback);
      return () => {
        allSubscribers.delete(callback);
      };
    },

    getSnapshot() {
      return structuredClone(snapshot) as DeepPartial<T["_output"]>;
    },

    reset() {
      snapshot = {};
    },

    complete() {
      const paths = getAllLeafPaths(snapshot, "");
      const now = Date.now();
      const updates: AIFieldUpdate[] = paths.map((path) => ({
        fieldPath: path,
        value: getValueAtPath(snapshot, path),
        previousValue: getValueAtPath(snapshot, path),
        isComplete: true,
        timestamp: now,
      }));
      notify(updates);
    },
  };
}
