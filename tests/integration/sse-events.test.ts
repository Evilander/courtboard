import { describe, it, expect } from "vitest";

describe("SSE Event Bus", () => {
  it("emits events to subscribers", async () => {
    const { emitDisplayUpdate, subscribeDisplayUpdates } = await import(
      "@/lib/sse/bus"
    );

    const received: unknown[] = [];
    const unsubscribe = subscribeDisplayUpdates((event) => {
      received.push(event);
    });

    emitDisplayUpdate({ type: "schedule.updated" });
    emitDisplayUpdate({ type: "content.updated" });

    expect(received.length).toBe(2);
    expect((received[0] as { type: string }).type).toBe("schedule.updated");
    expect((received[1] as { type: string }).type).toBe("content.updated");

    unsubscribe();
  });

  it("stops receiving after unsubscribe", async () => {
    const { emitDisplayUpdate, subscribeDisplayUpdates } = await import(
      "@/lib/sse/bus"
    );

    const received: unknown[] = [];
    const unsubscribe = subscribeDisplayUpdates((event) => {
      received.push(event);
    });

    emitDisplayUpdate({ type: "schedule.updated" });
    expect(received.length).toBe(1);

    unsubscribe();
    emitDisplayUpdate({ type: "content.updated" });
    expect(received.length).toBe(1); // still 1, not 2
  });

  it("supports multiple concurrent subscribers", async () => {
    const { emitDisplayUpdate, subscribeDisplayUpdates } = await import(
      "@/lib/sse/bus"
    );

    const received1: unknown[] = [];
    const received2: unknown[] = [];
    const unsub1 = subscribeDisplayUpdates((e) => received1.push(e));
    const unsub2 = subscribeDisplayUpdates((e) => received2.push(e));

    emitDisplayUpdate({ type: "alert.updated" });

    expect(received1.length).toBe(1);
    expect(received2.length).toBe(1);

    unsub1();
    unsub2();
  });

  it("includes timestamp in emitted events", async () => {
    const { emitDisplayUpdate, subscribeDisplayUpdates } = await import(
      "@/lib/sse/bus"
    );

    let eventAt = "";
    const unsubscribe = subscribeDisplayUpdates((event) => {
      eventAt = event.at;
    });

    emitDisplayUpdate({ type: "schedule.updated" });

    expect(eventAt).toBeTruthy();
    expect(new Date(eventAt).getTime()).toBeGreaterThan(0);

    unsubscribe();
  });
});
