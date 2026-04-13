import { describe, expect, it } from "vitest";
import { z } from "zod";
import { createFieldRouter, diffPartialObjects } from "./stream";
import type { AIFieldUpdate } from "./types";

describe("diffPartialObjects", () => {
  it("detects a new field appearing", () => {
    const updates = diffPartialObjects({}, { name: "John" });
    expect(updates).toHaveLength(1);
    expect(updates[0]).toMatchObject({
      fieldPath: "name",
      value: "John",
      isComplete: false,
    });
  });

  it("returns no updates when values are identical", () => {
    const obj = { name: "John", age: 30 };
    const updates = diffPartialObjects(obj, obj);
    expect(updates).toHaveLength(0);
  });

  it("detects a value change with correct previousValue", () => {
    const updates = diffPartialObjects({ name: "Jo" }, { name: "John" });
    expect(updates).toHaveLength(1);
    expect(updates[0]).toMatchObject({
      fieldPath: "name",
      value: "John",
      previousValue: "Jo",
    });
  });

  it("handles nested object diffing with dot-notation paths", () => {
    const prev = { address: { city: "SF" } };
    const next = { address: { city: "SF", zip: "94105" } };
    const updates = diffPartialObjects(prev, next);
    expect(updates).toHaveLength(1);
    expect(updates[0]).toMatchObject({
      fieldPath: "address.zip",
      value: "94105",
    });
  });

  it("treats arrays as single units", () => {
    const prev = { tags: ["a", "b"] };
    const next = { tags: ["a", "b", "c"] };
    const updates = diffPartialObjects(prev, next);
    expect(updates).toHaveLength(1);
    expect(updates[0]).toMatchObject({
      fieldPath: "tags",
      value: ["a", "b", "c"],
    });
  });

  it("skips undefined values in next", () => {
    const updates = diffPartialObjects({}, { name: undefined });
    expect(updates).toHaveLength(0);
  });

  it("detects multiple fields changing at once", () => {
    const prev = { name: "Jo", email: "" };
    const next = { name: "John", email: "john@acme.com" };
    const updates = diffPartialObjects(prev, next);
    expect(updates).toHaveLength(2);
  });

  it("handles nested object appearing from empty prev", () => {
    const updates = diffPartialObjects({}, { address: { city: "NYC" } });
    expect(updates).toHaveLength(1);
    expect(updates[0]).toMatchObject({ fieldPath: "address.city", value: "NYC" });
  });
});

describe("createFieldRouter", () => {
  const schema = z.object({
    name: z.string(),
    email: z.string().email(),
    company: z.string(),
  });

  it("tracks sequential updates building up an object", () => {
    const router = createFieldRouter(schema);

    const u1 = router.update({ name: "Jo" });
    expect(u1).toHaveLength(1);

    const u2 = router.update({ name: "John", email: "john" });
    expect(u2).toHaveLength(2); // name changed + email new

    const u3 = router.update({ name: "John", email: "john@acme.com", company: "Acme" });
    expect(u3).toHaveLength(2); // email changed + company new, name unchanged
  });

  it("does not emit duplicate events for unchanged fields", () => {
    const router = createFieldRouter(schema);
    router.update({ name: "John" });

    const u2 = router.update({ name: "John", email: "test@test.com" });
    const nameUpdates = u2.filter((u) => u.fieldPath === "name");
    expect(nameUpdates).toHaveLength(0);
  });

  it("subscribe fires for matching fieldPath only", () => {
    const router = createFieldRouter(schema);
    const nameUpdates: AIFieldUpdate[] = [];
    const emailUpdates: AIFieldUpdate[] = [];

    router.subscribe("name", (u) => nameUpdates.push(u));
    router.subscribe("email", (u) => emailUpdates.push(u));

    router.update({ name: "John" });
    expect(nameUpdates).toHaveLength(1);
    expect(emailUpdates).toHaveLength(0);

    router.update({ email: "john@test.com" });
    expect(nameUpdates).toHaveLength(1);
    expect(emailUpdates).toHaveLength(1);
  });

  it("subscribeAll fires for every field update", () => {
    const router = createFieldRouter(schema);
    const allUpdates: AIFieldUpdate[] = [];
    router.subscribeAll((u) => allUpdates.push(u));

    router.update({ name: "John", email: "john@test.com" });
    expect(allUpdates).toHaveLength(2);
  });

  it("unsubscribe stops callbacks", () => {
    const router = createFieldRouter(schema);
    const updates: AIFieldUpdate[] = [];
    const unsub = router.subscribe("name", (u) => updates.push(u));

    router.update({ name: "John" });
    expect(updates).toHaveLength(1);

    unsub();
    router.update({ name: "Jane" });
    expect(updates).toHaveLength(1); // no new callback
  });

  it("reset clears snapshot; subsequent update treats all as new", () => {
    const router = createFieldRouter(schema);
    router.update({ name: "John" });
    router.reset();

    const snapshot = router.getSnapshot();
    expect(snapshot).toEqual({});

    const updates = router.update({ name: "John" });
    expect(updates).toHaveLength(1); // treated as new
  });

  it("complete marks all current fields as isComplete: true", () => {
    const router = createFieldRouter(schema);
    router.update({ name: "John", email: "john@test.com" });

    const completeUpdates: AIFieldUpdate[] = [];
    router.subscribeAll((u) => completeUpdates.push(u));
    router.complete();

    expect(completeUpdates).toHaveLength(2);
    for (const u of completeUpdates) {
      expect(u.isComplete).toBe(true);
    }
  });

  it("getSnapshot returns a deep clone", () => {
    const router = createFieldRouter(schema);
    router.update({ name: "John" });

    const snap = router.getSnapshot() as Record<string, unknown>;
    snap["name"] = "MUTATED";

    const snap2 = router.getSnapshot() as Record<string, unknown>;
    expect(snap2["name"]).toBe("John");
  });

  it("supports concurrent subscriptions to the same field", () => {
    const router = createFieldRouter(schema);
    const cb1: AIFieldUpdate[] = [];
    const cb2: AIFieldUpdate[] = [];

    router.subscribe("name", (u) => cb1.push(u));
    router.subscribe("name", (u) => cb2.push(u));

    router.update({ name: "John" });
    expect(cb1).toHaveLength(1);
    expect(cb2).toHaveLength(1);
  });

  it("handles nested object schemas", () => {
    const nestedSchema = z.object({
      address: z.object({ city: z.string(), zip: z.string() }),
    });
    const router = createFieldRouter(nestedSchema);
    const updates: AIFieldUpdate[] = [];
    router.subscribeAll((u) => updates.push(u));

    router.update({ address: { city: "NYC" } });
    expect(updates).toHaveLength(1);
    expect(updates[0]?.fieldPath).toBe("address.city");

    router.update({ address: { city: "NYC", zip: "10001" } });
    expect(updates).toHaveLength(2);
    expect(updates[1]?.fieldPath).toBe("address.zip");
  });
});
