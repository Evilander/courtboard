"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { signOut } from "next-auth/react";

const ACTIVITY_EVENTS = [
  "keydown",
  "mousedown",
  "mousemove",
  "scroll",
  "touchstart",
] as const;
const WARNING_WINDOW_MS = 60_000;

export function AdminIdleSession({
  idleTimeoutMinutes,
}: {
  idleTimeoutMinutes: number;
}) {
  const [warningSecondsLeft, setWarningSecondsLeft] = useState<number | null>(
    null,
  );

  useEffect(() => {
    if (idleTimeoutMinutes <= 0) {
      return;
    }

    const timeoutMs = idleTimeoutMinutes * 60_000;
    const warningWindowMs = Math.min(WARNING_WINDOW_MS, timeoutMs);
    let warningTimer: number | null = null;
    let signOutTimer: number | null = null;
    let countdownTimer: number | null = null;

    function clearTimers() {
      if (warningTimer !== null) {
        window.clearTimeout(warningTimer);
      }

      if (signOutTimer !== null) {
        window.clearTimeout(signOutTimer);
      }

      if (countdownTimer !== null) {
        window.clearInterval(countdownTimer);
      }
    }

    function scheduleTimers() {
      clearTimers();
      setWarningSecondsLeft(null);

      warningTimer = window.setTimeout(() => {
        setWarningSecondsLeft(Math.ceil(warningWindowMs / 1000));
        countdownTimer = window.setInterval(() => {
          setWarningSecondsLeft((current) => {
            if (current === null) {
              return null;
            }

            return current > 1 ? current - 1 : 1;
          });
        }, 1000);
      }, Math.max(timeoutMs - warningWindowMs, 0));

      signOutTimer = window.setTimeout(() => {
        void signOut({ callbackUrl: "/login?reason=idle" });
      }, timeoutMs);
    }

    function handleActivity() {
      scheduleTimers();
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        scheduleTimers();
      }
    }

    scheduleTimers();

    for (const eventName of ACTIVITY_EVENTS) {
      window.addEventListener(eventName, handleActivity, { passive: true });
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearTimers();

      for (const eventName of ACTIVITY_EVENTS) {
        window.removeEventListener(eventName, handleActivity);
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [idleTimeoutMinutes]);

  if (warningSecondsLeft === null) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed bottom-4 left-1/2 z-50 w-[min(34rem,calc(100%-2rem))] -translate-x-1/2 rounded-2xl border border-amber-300/40 bg-stone-950/95 px-4 py-3 text-sm text-amber-100 shadow-2xl shadow-black/50 backdrop-blur">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 flex-none text-amber-300" />
        <p>
          Session ends in {warningSecondsLeft}s due to inactivity. Move the
          mouse, scroll, or press any key to stay signed in.
        </p>
      </div>
    </div>
  );
}
