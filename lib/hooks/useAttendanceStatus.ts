import { useCallback, useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Attendance } from "@/lib/types";
import { getShiftDayStart } from "@/lib/utils/shiftTime";

interface AttendanceStatus {
  lastPunch: Attendance | null;
  todayPunches: Attendance[];
  isIn: boolean;
  refresh: () => Promise<void>;
}

export const useAttendanceStatus = (userId?: string | null): AttendanceStatus => {
  const [lastPunch, setLastPunch] = useState<Attendance | null>(null);
  const [todayPunches, setTodayPunches] = useState<Attendance[]>([]);

  const refresh = useCallback(async () => {
    if (!userId) return;
    const supabase = createSupabaseBrowserClient();
    // Use shift day start (4 AM IST) instead of midnight so overnight shifts
    // are treated as a single attendance day and reset correctly at 4 AM.
    const startOfDay = getShiftDayStart();

    const { data } = await supabase
      .from("attendance")
      .select("*")
      .eq("user_id", userId)
      .gte("punched_at", startOfDay.toISOString())
      .order("punched_at", { ascending: false })
      .limit(1000);

    const punches = (data as Attendance[] | null) ?? [];
    setLastPunch(punches[0] ?? null);
    setTodayPunches([...punches].reverse());
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { lastPunch, todayPunches, isIn: lastPunch?.type === "IN", refresh };
};
