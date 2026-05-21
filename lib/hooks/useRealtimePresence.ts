import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Attendance, Employee } from "@/lib/types";

interface PresenceStats {
  currentlyIn: number;
  late: number;
  absent: number;
}

export const useRealtimePresence = () => {
  const [stats, setStats] = useState<PresenceStats>({
    currentlyIn: 0,
    late: 0,
    absent: 0,
  });
  const [presentEmployees, setPresentEmployees] = useState<Attendance[]>([]);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let isMounted = true;

    const computeStats = async () => {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const lateCutoff = new Date();
      lateCutoff.setHours(9, 30, 0, 0);

      const { data: employees } = await supabase
        .from("employees")
        .select("id");
      const { data: todays } = await supabase
        .from("attendance")
        .select("*")
        .gte("punched_at", startOfDay.toISOString());

      const attendanceRows = (todays ?? []) as Attendance[];
      const employeeRows = (employees ?? []) as Employee[];

      const lastPunchByUser = new Map<string, Attendance>();
      const firstInByUser = new Map<string, Attendance>();

      attendanceRows.forEach((row) => {
        const existing = lastPunchByUser.get(row.user_id);
        if (!existing || new Date(row.punched_at) > new Date(existing.punched_at)) {
          lastPunchByUser.set(row.user_id, row);
        }
        if (row.type === "IN") {
          const first = firstInByUser.get(row.user_id);
          if (!first || new Date(row.punched_at) < new Date(first.punched_at)) {
            firstInByUser.set(row.user_id, row);
          }
        }
      });

      const currentlyIn = Array.from(lastPunchByUser.values()).filter(
        (row) => row.type === "IN"
      );
      const late = Array.from(firstInByUser.values()).filter(
        (row) => new Date(row.punched_at) > lateCutoff
      );
      const absent =
        employeeRows.length -
        new Set(attendanceRows.map((row) => row.user_id)).size;

      if (isMounted) {
        setPresentEmployees(currentlyIn);
        setStats({
          currentlyIn: currentlyIn.length,
          late: late.length,
          absent: Math.max(absent, 0),
        });
      }
    };

    computeStats();

    const channel = supabase
      .channel("attendance-updates")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "attendance" },
        () => {
          computeStats();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return { stats, presentEmployees };
};
