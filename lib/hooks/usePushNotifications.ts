import { useCallback, useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const toUint8Array = (base64String: string) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
};

export const usePushNotifications = (userId?: string | null) => {
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    const check = async () => {
      if (!userId || !("serviceWorker" in navigator)) return;
      const supabase = createSupabaseBrowserClient();
      const { data } = await supabase
        .from("push_subscriptions")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();
      setIsEnabled(Boolean(data));
    };
    check();
  }, [userId]);

  const enable = useCallback(async () => {
    if (!userId || !("serviceWorker" in navigator)) return false;
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return false;

    const registration = await navigator.serviceWorker.ready;
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) return false;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: toUint8Array(publicKey),
    });

    const supabase = createSupabaseBrowserClient();
    await supabase.from("push_subscriptions").insert({
      user_id: userId,
      subscription,
    });
    setIsEnabled(true);
    return true;
  }, [userId]);

  const disable = useCallback(async () => {
    if (!userId || !("serviceWorker" in navigator)) return false;
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    await subscription?.unsubscribe();
    const supabase = createSupabaseBrowserClient();
    await supabase.from("push_subscriptions").delete().eq("user_id", userId);
    setIsEnabled(false);
    return true;
  }, [userId]);

  return { isEnabled, enable, disable, setIsEnabled };
};
