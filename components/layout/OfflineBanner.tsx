"use client";

import { useOnlineStatus } from "@/lib/hooks/useOnlineStatus";

export const OfflineBanner = () => {
  const { isOnline } = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="w-full bg-danger text-background text-center text-xs py-2 uppercase tracking-[2px]">
      You are offline. Punch requires an internet connection.
    </div>
  );
};

export const CachedBanner = () => {
  const { isOnline } = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="w-full bg-surface-2 text-text-muted text-center text-xs py-2 uppercase tracking-[2px]">
      Showing cached data — some info may be outdated
    </div>
  );
};
