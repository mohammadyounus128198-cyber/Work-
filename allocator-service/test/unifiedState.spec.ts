import { describe, expect, it } from "vitest";
import {
  buildUnifiedState,
  renderVerified,
  type FrontierCandidate,
} from "../src/matrix/unifiedState";

const frontier: FrontierCandidate[] = [
  {
    id: "c1",
    decision: "model",
    metrics: { safety: 0.9, cost: 0.25, latency: 110 },
  },
  {
    id: "c2",
    decision: "defer",
    metrics: { safety: 0.8, cost: 0.3, latency: 100 },
  },
  {
    id: "c3",
    decision: "reject",
    metrics: { safety: 0.4, cost: 0.1, latency: 50 },
  },
];

describe("unified visual integrity", () => {
  it("builds deterministic canonical + visual hashes", () => {
    const a = buildUnifiedState(frontier);
    const b = buildUnifiedState([...frontier].reverse());

    expect(a.canonical).toEqual(b.canonical);
    expect(a.visual).toEqual(b.visual);
    expect(a.hashes).toEqual(b.hashes);
  });

  it("aborts dead states with no frontier candidates", () => {
    expect(() => buildUnifiedState([])).toThrow("Dead state: no valid decisions");
  });

  it("aborts render when visual hash is tampered", () => {
    const unified = buildUnifiedState(frontier);
    const tampered = {
      ...unified,
      hashes: { ...unified.hashes, visual: "bad-hash" },
    };

    expect(() => renderVerified(tampered)).toThrow("Render aborted: visual integrity failure");
  });

  it("aborts when selected is not in frontier", () => {
    expect(() => buildUnifiedState(frontier, "unknown-id")).toThrow(
      "No selected decision — undefined visual state",
    );
  });

  it("normalizes floating metrics to prevent precision drift", () => {
    const input: FrontierCandidate[] = [
      {
        id: "f1",
        decision: "model",
        metrics: { safety: 0.1 + 0.2, cost: 0.11119, latency: 120.9876 },
      },
    ];

    const unified = buildUnifiedState(input);
    expect(unified.canonical.selected.metrics.safety).toBe(0.3);
    expect(unified.canonical.selected.metrics.cost).toBe(0.111);
    expect(unified.canonical.selected.metrics.latency).toBe(120.988);
  });
});
