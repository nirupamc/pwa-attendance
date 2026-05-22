"use client";

import { useState, useEffect, useCallback } from "react";

export type NetworkStatus =
  | "checking"
  | "office_wifi"
  | "wrong_network"
  | "offline"
  | "not_configured";

interface OnlineStatus {
  isOnline: boolean;
  isOfficeNetwork: boolean;
  networkStatus: NetworkStatus;
  currentIp: string | null;
  isChecking: boolean;
  recheck: () => void;
}

async function checkOfficeNetwork(): Promise<{
  isOfficeNetwork: boolean;
  configured: boolean;
  currentIp?: string | null;
}> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch("/api/verify-office-ip", {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return { isOfficeNetwork: false, configured: false };
    return res.json();
  } catch {
    return { isOfficeNetwork: false, configured: false };
  }
}

export function useOnlineStatus(): OnlineStatus {
  const [networkStatus, setNetworkStatus] =
    useState<NetworkStatus>("checking");
  const [currentIp, setCurrentIp] = useState<string | null>(null);

  const checkConnectivity = useCallback(async () => {
    if (!navigator.onLine) {
      setNetworkStatus("offline");
      return;
    }

    setNetworkStatus("checking");

    const result = await checkOfficeNetwork();
    setCurrentIp(result.currentIp ?? null);

    if (result.isOfficeNetwork) {
      setNetworkStatus("office_wifi");
    } else if (!result.configured) {
      setNetworkStatus("not_configured");
    } else {
      setNetworkStatus("wrong_network");
    }
  }, []);

  useEffect(() => {
    checkConnectivity();

    const handleOnline = () => checkConnectivity();
    const handleOffline = () => {
      setNetworkStatus("offline");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const interval = setInterval(checkConnectivity, 60000);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        checkConnectivity();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [checkConnectivity]);

  return {
    isOnline: networkStatus !== "offline",
    isOfficeNetwork: networkStatus === "office_wifi",
    networkStatus,
    currentIp,
    isChecking: networkStatus === "checking",
    recheck: checkConnectivity,
  };
}
