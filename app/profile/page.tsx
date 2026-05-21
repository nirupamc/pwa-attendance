"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Employee } from "@/lib/types";
import { usePushNotifications } from "@/lib/hooks/usePushNotifications";
import { BottomNav } from "@/components/layout/BottomNav";
import { CachedBanner } from "@/components/layout/OfflineBanner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

type NavigatorWithConnection = Navigator & {
  connection?: {
    type?: string;
    effectiveType?: string;
    addEventListener?: (type: string, listener: () => void) => void;
    removeEventListener?: (type: string, listener: () => void) => void;
  };
};

export default function ProfilePage() {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [connection, setConnection] = useState("Unknown");
  const { enable, disable, isEnabled } = usePushNotifications(employee?.id);

  useEffect(() => {
    const fetchProfile = async () => {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("employees")
        .select("*")
        .eq("id", user.id)
        .single();
      setEmployee(data as Employee);
    };
    fetchProfile();
  }, []);

  const updateConnection = () => {
    const connectionObj = (navigator as NavigatorWithConnection).connection;
    const type =
      connectionObj?.type || connectionObj?.effectiveType || "Unknown";
    setConnection(navigator.onLine ? type.toString() : "Offline");
  };

  useEffect(() => {
    updateConnection();
    window.addEventListener("online", updateConnection);
    window.addEventListener("offline", updateConnection);
    return () => {
      window.removeEventListener("online", updateConnection);
      window.removeEventListener("offline", updateConnection);
    };
  }, []);

  const initials = useMemo(() => {
    if (!employee?.full_name) return "PA";
    return employee.full_name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [employee]);

  const handleToggle = async () => {
    if (isEnabled) {
      await disable();
      toast.success("Notifications disabled");
      return;
    }
    const ok = await enable();
    if (!ok) {
      toast.error("Notification permission denied");
      return;
    }
    toast.success("Notifications enabled");
  };

  const handleSignOut = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <CachedBanner />
      <div className="mx-auto max-w-3xl px-6 py-8 space-y-6">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-background font-heading text-2xl">
            {initials}
          </div>
          <div>
            <h2 className="font-heading text-2xl uppercase tracking-[3px]">
              {employee?.full_name ?? "Employee"}
            </h2>
            <p className="text-sm text-text-muted">
              {employee?.employee_id ?? "EMP"}
            </p>
          </div>
          <span className="ml-auto rounded-full bg-primary/20 px-3 py-1 text-xs text-primary">
            {employee?.role === "admin" ? "Admin" : "Employee"}
          </span>
        </div>

        <div className="rounded-xl border border-border bg-surface p-4">
          <h3 className="font-heading text-lg uppercase tracking-[3px] text-primary">
            Connection Status
          </h3>
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-text-muted">{connection}</span>
            <Button
              variant="outline"
              className="border-primary text-primary"
              onClick={updateConnection}
            >
              Refresh
            </Button>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-4">
          <h3 className="font-heading text-lg uppercase tracking-[3px] text-primary">
            Notifications
          </h3>
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-text-muted">Leave Notifications</span>
            <Switch checked={isEnabled} onCheckedChange={handleToggle} />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-4">
          <h3 className="font-heading text-lg uppercase tracking-[3px] text-primary">
            App Info
          </h3>
          <div className="mt-3 text-sm text-text-muted space-y-2">
            <p>App Version: 1.0.0</p>
            <p>
              PWA Status:{" "}
              {typeof window !== "undefined" &&
              window.matchMedia("(display-mode: standalone)").matches
                ? "Installed"
                : "Running in browser"}
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          className="w-full border-danger text-danger"
          onClick={handleSignOut}
        >
          Sign Out
        </Button>
      </div>

      <BottomNav />
    </div>
  );
}
