"use client";

import { Loader2, RefreshCw, Shield, ShieldOff, Wifi, WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/lib/hooks/useOnlineStatus";

export const NetworkStatusBanner = () => {
  const { networkStatus, recheck } = useOnlineStatus();

  if (networkStatus === "checking") {
    return (
      <div className="flex w-full items-center gap-3 rounded-xl border border-border bg-surface p-4">
        <Loader2 className="h-5 w-5 shrink-0 animate-spin text-primary" />
        <span className="text-sm text-text-muted">
          Verifying office network...
        </span>
      </div>
    );
  }

  if (networkStatus === "offline") {
    return (
      <div className="flex w-full items-center gap-3 rounded-xl border border-danger bg-danger/10 p-4">
        <WifiOff className="h-5 w-5 shrink-0 text-danger" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-danger">
            No Internet Connection
          </p>
          <p className="mt-0.5 text-xs text-danger/70">
            Connect to the internet to punch in
          </p>
        </div>
        <button
          onClick={recheck}
          aria-label="Recheck connection"
          className="text-danger/70 hover:text-danger"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>
    );
  }

  if (networkStatus === "not_configured") {
    return (
      <div className="flex w-full items-center gap-3 rounded-xl border border-warning/40 bg-warning/10 p-4">
        <Shield className="h-5 w-5 shrink-0 text-warning" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-warning">
            Office Network Not Configured
          </p>
          <p className="mt-0.5 text-xs text-warning/70">
            Ask your admin to configure the office network IP
          </p>
        </div>
        <button
          onClick={recheck}
          aria-label="Recheck connection"
          className="text-warning/70 hover:text-warning"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>
    );
  }

  if (networkStatus === "wrong_network") {
    return (
      <div className="flex w-full items-center gap-3 rounded-xl border border-danger bg-danger/10 p-4">
        <ShieldOff className="h-5 w-5 shrink-0 text-danger" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-danger">Not on Office WiFi</p>
          <p className="mt-0.5 text-xs text-danger/70">
            Connect to the office WiFi network to punch in
          </p>
        </div>
        <button
          onClick={recheck}
          aria-label="Recheck connection"
          className="text-danger/70 hover:text-danger"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex w-full items-center gap-3 rounded-xl border border-success/30 bg-success/10 p-4">
      <Wifi className="h-5 w-5 shrink-0 text-success" />
      <div className="flex-1">
        <p className="text-sm font-semibold text-success">
          Office WiFi — punch available
        </p>
        <p className="mt-0.5 text-xs text-success/70">QR verification active</p>
      </div>
      <button
        onClick={recheck}
        aria-label="Recheck connection"
        className="text-success/70 hover:text-success"
      >
        <RefreshCw className="h-4 w-4" />
      </button>
    </div>
  );
};
