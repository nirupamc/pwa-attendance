"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useAttendanceStatus } from "@/lib/hooks/useAttendanceStatus";
import { useOnlineStatus } from "@/lib/hooks/useOnlineStatus";
import { useShiftTime } from "@/lib/hooks/useShiftTime";
import { useStaggerIn } from "@/lib/hooks/useStaggerIn";
import { clearDeviceSecurityCache, getDeviceSecurityPayload } from "@/lib/security/device-client";
import { formatDate, formatTime } from "@/lib/utils/time";
import { BottomNav } from "@/components/layout/BottomNav";
import { OfflineBanner } from "@/components/layout/OfflineBanner";
import { NetworkStatusBanner } from "@/components/home/NetworkStatusBanner";
import { LiveWorkTimer } from "@/components/home/LiveWorkTimer";
import { PunchButton } from "@/components/home/PunchButton";
import { QRScannerModal } from "@/components/home/QRScannerModal";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

type LocationCapture = {
  latitude: number;
  longitude: number;
  accuracy: number;
  locationCapturedAt: string;
} | null;

const captureLocation = (): Promise<LocationCapture> =>
  new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          locationCapturedAt: new Date().toISOString(),
        }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    );
  });

export default function HomePage() {
  const { isOfficeNetwork, networkStatus } = useOnlineStatus();
  const { isWithinWindow, windowMessage } = useShiftTime();
  const [userId, setUserId] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string>("Employee");
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDeviceTrusted, setIsDeviceTrusted] = useState(true);
  const [isDeviceTrustChecked, setIsDeviceTrustChecked] = useState(false);
  const [deviceTrustMessage, setDeviceTrustMessage] = useState(
    "This account is registered on another trusted device."
  );
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

  useEffect(() => {
    const verifyDeviceTrust = async () => {
      if (!userId) return;
      try {
        const requestRegister = async (forceRebind = false) => {
          const payload = await getDeviceSecurityPayload();
          const res = await fetch("/api/device/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...payload, forceRebind }),
          });
          const data = (await res.json().catch(() => null)) as
            | {
                trusted?: boolean;
                message?: string;
                code?: string;
                rebindRequired?: boolean;
              }
            | null;
          return { res, data };
        };

        let { data } = await requestRegister();

        if (data?.code === "pending_rebind") {
          console.info("[device] pending_rebind detected; clearing local cache");
          clearDeviceSecurityCache();
          localStorage.removeItem("tt_device_trust");
          localStorage.removeItem("tt_device_message");
          console.info("[device] stale device token cleared; re-registering");
          ({ data } = await requestRegister(true));
          if (data?.trusted) {
            console.info("[device] rebind recovery successful");
          }
        }

        if (data?.code === "registered") {
          console.info("[device] registration successful");
        }
        if (data?.code === "pending_rebind_recovered") {
          console.info("[device] rebind recovery completed");
        }
        if (data?.code === "not_trusted") {
          console.info("[device] mismatch detected");
        }

        const trusted = Boolean(data?.trusted);
        setIsDeviceTrusted(trusted);
        setDeviceTrustMessage(
          trusted
            ? ""
            : data?.message || "This account is registered on another trusted device."
        );
        setIsDeviceTrustChecked(true);
        localStorage.setItem("tt_device_trust", trusted ? "trusted" : "blocked");
        if (!trusted) {
          localStorage.setItem(
            "tt_device_message",
            data?.message || "This account is registered on another trusted device."
          );
        } else {
          localStorage.removeItem("tt_device_message");
        }
      } catch {
        setIsDeviceTrusted(false);
        setDeviceTrustMessage("This account is registered on another trusted device.");
        setIsDeviceTrustChecked(true);
      }
    };

    verifyDeviceTrust();
  }, [userId]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "GOOD MORNING";
    if (hour < 18) return "GOOD AFTERNOON";
    return "GOOD EVENING";
  }, []);

  const punchDisabled =
    !isOfficeNetwork ||
    networkStatus === "checking" ||
    !isWithinWindow ||
    !isDeviceTrustChecked ||
    !isDeviceTrusted;

  const punchHelperText = !isDeviceTrustChecked
    ? "Verifying trusted device..."
    : !isDeviceTrusted
    ? deviceTrustMessage
    : !isWithinWindow
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
    if (!userId || !qrToken || !isOfficeNetwork || !isWithinWindow || !isDeviceTrusted) {
      toast.error(
        !isDeviceTrusted
          ? deviceTrustMessage || "This account is registered on another trusted device."
          : !isWithinWindow
          ? windowMessage || "Punching is only available from 5:45 PM to 3:30 AM."
          : "You must be connected to the office WiFi to punch in or out."
      );
      return;
    }
    const action = isIn ? "OUT" : "IN";

    try {
      const devicePayload = await getDeviceSecurityPayload();

      const locationData = await captureLocation();
      if (locationData) {
        console.info(
          `[geofence] Location captured: ${locationData.latitude}, ${locationData.longitude} ±${locationData.accuracy}m`
        );
      } else {
        console.info("[geofence] Location unavailable; punch will proceed without geofence data");
      }

      const res = await fetch("/api/punch-attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          type: action,
          qrToken,
          ...devicePayload,
          latitude: locationData?.latitude ?? null,
          longitude: locationData?.longitude ?? null,
          accuracy: locationData?.accuracy ?? null,
          locationCapturedAt: locationData?.locationCapturedAt ?? null,
        }),
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

  const containerRef = useStaggerIn(0.1);

  return (
    <div className="min-h-screen bg-background pb-24">
      <OfflineBanner />
      <div
        ref={containerRef}
        className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-8"
      >
        <div data-animate>
          <h1 className="font-heading text-3xl uppercase tracking-[4px] text-primary">
            {greeting}, {fullName.toUpperCase()}
          </h1>
          <p className="text-sm text-text-muted">{formatDate(new Date())}</p>
        </div>

        <div data-animate>
          <NetworkStatusBanner />
        </div>

        {userId && (
          <div data-animate>
            <LiveWorkTimer userId={userId} />
          </div>
        )}

        <div className="pt-2" data-animate>
          <PunchButton
            isIn={isIn}
            disabled={punchDisabled}
            helperText={punchHelperText}
            onClick={() => {
              if (punchDisabled) {
                toast.error(
                  !isDeviceTrustChecked
                    ? "Verifying trusted device..."
                    : !isDeviceTrusted
                    ? deviceTrustMessage
                    : "You must be connected to the office WiFi to punch in or out."
                );
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
