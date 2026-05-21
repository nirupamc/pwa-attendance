"use client";

import { useEffect, useState } from "react";
import { useAttendanceStatus } from "@/lib/hooks/useAttendanceStatus";
import { diffSeconds, formatDuration, formatTime } from "@/lib/utils/time";

interface LiveWorkTimerProps {
  userId: string;
}

export const LiveWorkTimer = ({ userId }: LiveWorkTimerProps) => {
  const { lastPunch, isIn } = useAttendanceStatus(userId);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!lastPunch || !isIn) {
      setSeconds(0);
      return;
    }
    const start = new Date(lastPunch.punched_at);
    const tick = () => setSeconds(diffSeconds(start, new Date()));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [lastPunch, isIn]);

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="text-xs uppercase tracking-[2px] text-text-muted">
        Today&apos;s Active Time
      </p>
      <div
        className={`mt-2 font-heading text-4xl tracking-[4px] ${
          isIn ? "text-success" : "text-text-muted"
        }`}
      >
        {formatDuration(seconds)}
      </div>
      <p className="mt-2 text-sm text-text-muted">
        {lastPunch
          ? `Punched ${lastPunch.type === "IN" ? "in" : "out"} at ${formatTime(
              new Date(lastPunch.punched_at)
            )}`
          : "Not punched in yet"}
      </p>
    </div>
  );
};
