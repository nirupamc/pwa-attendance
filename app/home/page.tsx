"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useAttendanceStatus } from "@/lib/hooks/useAttendanceStatus";
import { useOnlineStatus } from "@/lib/hooks/useOnlineStatus";
import { useShiftTime } from "@/lib/hooks/useShiftTime";
import { formatDate, formatTime } from "@/lib/utils/time";
import { BottomNav } from "@/components/layout/BottomNav";
import { OfflineBanner } from "@/components/layout/OfflineBanner";
import { NetworkStatusBanner } from "@/components/home/NetworkStatusBanner";
import { LiveWorkTimer } from "@/components/home/LiveWorkTimer";
import { PunchButton } from "@/components/home/PunchButton";
import { QRScannerModal } from "@/components/home/QRScannerModal";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  const { isOfficeNetwork, networkStatus } = useOnlineStatus();
  const { isWithinWindow, windowMessage } = useShiftTime();
  const [userId, setUserId] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string>("Employee");
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const { lastPunch, isIn, refresh } = useAttendanceStatus(userId);

  useEffect(() => {
    const fetchProfile = async () => {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data: profile } = await supabase
        .from("employees")
        .select("full_name")
        .eq("id", user.id)
        .single();
      if (profile?.full_name) setFullName(profile.full_name);
    };
    fetchProfile();
  }, []);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "GOOD MORNING";
    if (hour < 18) return "GOOD AFTERNOON";
    return "GOOD EVENING";
  }, []);

  const punchDisabled =
    !isOfficeNetwork || networkStatus === "checking" || !isWithinWindow;

  const punchHelperText = !isWithinWindow
    ? windowMessage
    : networkStatus === "office_wifi"
    ? "Scan the office QR code"
    : networkStatus === "wrong_network"
    ? "Connect to office WiFi to punch in"
    : networkStatus === "offline"
    ? "No internet connection"
    : networkStatus === "checking"
    ? "Verifying network..."
    : "Network not configured — contact admin";

  const handleVerified = (token: string) => {
    setQrToken(token);
    setShowScanner(false);
    setShowConfirm(true);
  };

  const handleConfirm = async () => {
    if (!userId || !qrToken || !isOfficeNetwork || !isWithinWindow) {
      toast.error(
        !isWithinWindow
          ? windowMessage || "Punching is only available from 5:45 PM to 3:30 AM."
          : "You must be connected to the office WiFi to punch in or out."
      );
      return;
    }
    const action = isIn ? "OUT" : "IN";

    try {
      const res = await fetch("/api/punch-attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, type: action, qrToken }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok || payload?.error) {
        toast.error(payload?.error ?? "Unable to punch. Please try again.");
        return;
      }
    } catch (err) {
      toast.error("Unable to punch. Please try again.");
      return;
    }

    toast.success(`Punch ${action} recorded ✓`);
    setQrToken(null);
    setShowConfirm(false);
    refresh();
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <OfflineBanner />
      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-8">
        <div>
          <h1 className="font-heading text-3xl uppercase tracking-[4px] text-primary">
            {greeting}, {fullName.toUpperCase()}
          </h1>
          <p className="text-sm text-text-muted">{formatDate(new Date())}</p>
        </div>

        <NetworkStatusBanner />

        {userId && <LiveWorkTimer userId={userId} />}

        <div className="pt-2">
          <PunchButton
            isIn={isIn}
            disabled={punchDisabled}
            helperText={punchHelperText}
            onClick={() => {
              if (punchDisabled) {
                toast.error("You must be connected to the office WiFi to punch in or out.");
                return;
              }
              setShowScanner(true);
            }}
          />
        </div>
      </div>

      <QRScannerModal
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onVerified={handleVerified}
      />

      <Sheet open={showConfirm} onOpenChange={setShowConfirm}>
        <SheetContent side="bottom" className="bg-surface border-border">
          <div className="flex flex-col items-center gap-3">
            <CheckCircle2 className="text-success" size={36} />
            <h3 className="font-heading text-2xl uppercase tracking-[3px] text-success">
              QR Verified ✓
            </h3>
            <div className="w-full rounded-xl border border-border bg-surface-2 p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-text-muted">Action</span>
                <span className="text-text-primary">
                  Punch {isIn ? "OUT" : "IN"}
                </span>
              </div>
              <div className="mt-2 flex justify-between">
                <span className="text-text-muted">Time</span>
                <span className="text-text-primary">
                  {formatTime(new Date())}
                </span>
              </div>
              <div className="mt-2 flex justify-between">
                <span className="text-text-muted">Date</span>
                <span className="text-text-primary">
                  {new Date().toLocaleDateString()}
                </span>
              </div>
            </div>
            <div className="flex w-full gap-3">
              <Button
                variant="outline"
                className="flex-1 border-primary text-primary"
                onClick={() => {
                  setQrToken(null);
                  setShowConfirm(false);
                }}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-primary text-background hover:bg-primary-dark"
                onClick={handleConfirm}
              >
                Confirm Punch {isIn ? "OUT" : "IN"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <BottomNav />
    </div>
  );
}
