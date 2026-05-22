"use client";

import { useEffect, useState } from "react";
import { useAttendanceStatus } from "@/lib/hooks/useAttendanceStatus";
import { diffSeconds, formatDuration, formatTime } from "@/lib/utils/time";

interface LiveWorkTimerProps {
  userId: string;
}

export const LiveWorkTimer = ({ userId }: LiveWorkTimerProps) => {
  const { lastPunch, todayPunches, isIn } = useAttendanceStatus(userId);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const computeWorkedSeconds = () => {
      if (todayPunches.length === 0) return 0;

      let total = 0;
      let openInAt: Date | null = null;

      for (const punch of todayPunches) {
        const punchedAt = new Date(punch.punched_at);

        if (punch.type === "IN") {
          openInAt = punchedAt;
          continue;
        }

        if (punch.type === "OUT" && openInAt) {
          total += diffSeconds(openInAt, punchedAt);
          openInAt = null;
        }
      }

      if (openInAt) {
        total += diffSeconds(openInAt, new Date());
      }

      return total;
    };

    const tick = () => setSeconds(computeWorkedSeconds());
    tick();

    if (!isIn) return;

    const interval = window.setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [todayPunches, isIn]);

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
