"use client";

import { useEffect, useState } from "react";
import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type DeferredPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "tantrack-install-dismissed";
const DISMISS_MS = 7 * 24 * 60 * 60 * 1000;

const isIosDevice = () =>
  /iphone|ipad|ipod/i.test(window.navigator.userAgent);

type NavigatorWithStandalone = Navigator & {
  standalone?: boolean;
};

const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  Boolean((window.navigator as NavigatorWithStandalone).standalone);

export const InstallBanner = () => {
  const [deferredPrompt, setDeferredPrompt] =
    useState<DeferredPromptEvent | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);

    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (dismissedAt && Date.now() - Number(dismissedAt) < DISMISS_MS) {
      setIsDismissed(true);
    }

    const handler = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as DeferredPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!isMounted) return null;

  const showBanner = !isDismissed && !isStandalone() && (isIosDevice() || Boolean(deferredPrompt));

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
    setIsDismissed(true);
  };

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      handleDismiss();
    }
  };

  if (!showBanner) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-primary text-background">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3 text-sm font-semibold">
        <div className="flex flex-col">
          <span className="uppercase tracking-[2px] font-heading text-base">
            Install TanTrack
          </span>
          {isIosDevice() ? (
            <span className="flex items-center gap-2 text-background/90">
              <Share2 size={16} />
              Tap the Share button then &quot;Add to Home Screen&quot; to
              install this app.
            </span>
          ) : (
            <span className="text-background/90">
              Tap here to add to your home screen.
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!isIosDevice() && (
            <Button
              onClick={handleInstall}
              className="bg-background text-primary hover:bg-primary-light"
            >
              Install
            </Button>
          )}
          <button
            onClick={handleDismiss}
            className="rounded-full border border-background/30 px-3 py-1 text-xs uppercase tracking-[2px]"
          >
            X
          </button>
        </div>
      </div>
    </div>
  );
};
