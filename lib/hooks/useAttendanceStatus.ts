import { useCallback, useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Attendance } from "@/lib/types";

interface AttendanceStatus {
  lastPunch: Attendance | null;
  isIn: boolean;
  refresh: () => Promise<void>;
}

export const useAttendanceStatus = (userId?: string | null): AttendanceStatus => {
  const [lastPunch, setLastPunch] = useState<Attendance | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) return;
    const supabase = createSupabaseBrowserClient();
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const { data } = await supabase
      .from("attendance")
      .select("*")
      .eq("user_id", userId)
      .gte("punched_at", startOfDay.toISOString())
      .order("punched_at", { ascending: false })
      .limit(1);

    setLastPunch((data?.[0] as Attendance) ?? null);
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { lastPunch, isIn: lastPunch?.type === "IN", refresh };
};
