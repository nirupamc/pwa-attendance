"use client";

import { ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useBSSIDCheck } from "@/lib/hooks/useBSSIDCheck";
import { useOnlineStatus } from "@/lib/hooks/useOnlineStatus";

type NavigatorWithConnection = Navigator & {
  connection?: {
    type?: string;
    effectiveType?: string;
    addEventListener?: (type: string, listener: () => void) => void;
    removeEventListener?: (type: string, listener: () => void) => void;
  };
};

export const getConnectionPill = (
  isOnline: boolean,
  connectionType: string
): { label: string; className: string } => {
  if (!isOnline) {
    return {
      label: "Offline — Punch disabled",
      className: "bg-danger/20 text-danger",
    };
  }
  const normalized = connectionType.toLowerCase();
  if (normalized.includes("wifi")) {
    return { label: "WiFi", className: "bg-success/20 text-success" };
  }
  return { label: "Mobile Data", className: "bg-warning/20 text-warning" };
};

export const NetworkStatusBanner = () => {
  const { isOnline } = useOnlineStatus();
  const { networks } = useBSSIDCheck();
  const [connectionType, setConnectionType] = useState("unknown");

  useEffect(() => {
    const update = () => {
      const connectionObj = (navigator as NavigatorWithConnection).connection;
      if (!navigator.onLine) {
        setConnectionType("offline");
        return;
      }
      if (!connectionObj) {
        setConnectionType("unknown");
        return;
      }
      const type = connectionObj.type || connectionObj.effectiveType || "unknown";
      setConnectionType(type.toString());
    };
    update();
    const connectionObj = (navigator as NavigatorWithConnection).connection;
    connectionObj?.addEventListener?.("change", update);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      connectionObj?.removeEventListener?.("change", update);
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  const pill = useMemo(
    () => getConnectionPill(isOnline, connectionType),
    [isOnline, connectionType]
  );

  return (
    <div className="rounded-xl border border-border border-l-[3px] border-l-primary bg-surface p-4">
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-primary/10 p-2 text-primary">
          <ShieldCheck size={20} />
        </div>
        <div className="flex-1">
          <h3 className="font-heading text-lg uppercase tracking-[3px] text-primary">
            QR Security Active
          </h3>
          <p className="text-sm text-text-muted">
            Scan the office QR code to verify your presence. Make sure you are
            physically in the office.
          </p>
          {networks.length > 0 && (
            <p className="mt-2 text-xs text-text-muted">
              {networks.length} office network
              {networks.length === 1 ? "" : "s"} registered for verification.
            </p>
          )}
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <span className={`rounded-full px-3 py-1 text-xs ${pill.className}`}>
          {pill.label}
        </span>
      </div>
    </div>
  );
};
