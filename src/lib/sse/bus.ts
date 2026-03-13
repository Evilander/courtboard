import type { ScreenZone } from "@/lib/db/schema";

export type DisplayUpdateEvent = {
  type:
    | "schedule.updated"
    | "content.updated"
    | "screen.updated"
    | "alert.updated"
    | "heartbeat.updated"
    | "user.updated";
  screenSlugs?: string[];
  zones?: ScreenZone[];
  at: string;
};

type Listener = (event: DisplayUpdateEvent) => void;

const globalForSse = globalThis as typeof globalThis & {
  __courtboardDisplayListeners?: Set<Listener>;
};

function getListeners() {
  if (!globalForSse.__courtboardDisplayListeners) {
    globalForSse.__courtboardDisplayListeners = new Set();
  }

  return globalForSse.__courtboardDisplayListeners;
}

export function subscribeDisplayUpdates(listener: Listener) {
  const listeners = getListeners();
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function emitDisplayUpdate(
  event: Omit<DisplayUpdateEvent, "at"> & { at?: string },
) {
  const payload: DisplayUpdateEvent = {
    ...event,
    at: event.at ?? new Date().toISOString(),
  };

  for (const listener of Array.from(getListeners())) {
    listener(payload);
  }
}
