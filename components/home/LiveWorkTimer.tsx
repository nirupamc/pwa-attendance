"use client";

import { useEffect, useRef, useState } from "react";
import { useAttendanceStatus } from "@/lib/hooks/useAttendanceStatus";
import { diffSeconds, formatDuration, formatTime } from "@/lib/utils/time";

interface LiveWorkTimerProps {
  userId: string;
}

export const LiveWorkTimer = ({ userId }: LiveWorkTimerProps) => {
  const { lastPunch, todayPunches, isIn } = useAttendanceStatus(userId);
  const [seconds, setSeconds] = useState(0);
  const [pulsing, setPulsing] = useState(false);
  const prevMinuteRef = useRef(-1);

  useEffect(() => {
    const computeWorkedSeconds = () => {
      if (todayPunches.length === 0) return 0;
      let total = 0;
      let openInAt: Date | null = null;
      for (const punch of todayPunches) {
        const punchedAt = new Date(punch.punched_at);
        if (punch.type === "IN") { openInAt = punchedAt; continue; }
        if (punch.type === "OUT" && openInAt) {
          total += diffSeconds(openInAt, punchedAt);
          openInAt = null;
        }
      }
      if (openInAt) total += diffSeconds(openInAt, new Date());
      return total;
    };

    const tick = () => {
      const s = computeWorkedSeconds();
      setSeconds(s);
      // soft pulse every minute change
      const currentMinute = Math.floor(s / 60);
      if (prevMinuteRef.current !== -1 && currentMinute !== prevMinuteRef.current) {
        setPulsing(true);
        setTimeout(() => setPulsing(false), 700);
      }
      prevMinuteRef.current = currentMinute;
    };

    tick();
    if (!isIn) return;
    const interval = window.setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [todayPunches, isIn]);

  return (
    <div
      className={[
        "rounded-xl border bg-surface p-4 hover-lift",
        "transition-colors duration-500",
        isIn ? "border-primary/25" : "border-border",
      ].join(" ")}
    >
      <p className="text-xs uppercase tracking-[2px] text-text-muted">
        Today&apos;s Active Time
      </p>
      <div
        className={[
          "mt-2 font-heading text-4xl timer-digits",
          "transition-colors duration-500",
          pulsing ? "animate-minute-pulse" : "",
          isIn ? "text-success" : "text-text-muted",
        ].join(" ")}
        key={isIn ? "active" : "inactive"}
        style={{ animation: pulsing ? undefined : undefined }}
      >
        {formatDuration(seconds)}
      </div>
      <p
        className={[
          "mt-2 text-sm transition-all duration-500",
          isIn ? "text-text-muted" : "text-text-muted/60",
        ].join(" ")}
      >
        {lastPunch
          ? `Punched ${lastPunch.type === "IN" ? "in" : "out"} at ${formatTime(
              new Date(lastPunch.punched_at)
            )}`
          : "Not punched in yet"}
      </p>
    </div>
  );
};
