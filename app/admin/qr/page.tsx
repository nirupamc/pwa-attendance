"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { QRCodeCanvas } from "qrcode.react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { OfficeQrCode } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";

export default function QrPage() {
  const [activeQr, setActiveQr] = useState<OfficeQrCode | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const bootstrappedRef = useRef(false);

  const fetchQr = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase
      .from("office_qr_codes")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) {
      toast.error("Unable to load the active QR code.");
      setActiveQr(null);
      setIsLoading(false);
      return false;
    }

    const latestQr = (data?.[0] as OfficeQrCode | undefined) ?? null;
    setActiveQr(latestQr);
    setIsLoading(false);
    return Boolean(latestQr);
  }, []);

  const createQr = useCallback(async () => {
    if (isGenerating) return;

    setIsGenerating(true);
    const response = await fetch("/api/admin/qr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    const data = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;

    if (!response.ok || data?.error) {
      toast.error(data?.error ?? "Unable to generate QR code.");
      setIsGenerating(false);
      return;
    }

    toast.success("New QR code generated. Print the new code and replace the old one.");
    setShowConfirm(false);
    await fetchQr();
    setIsGenerating(false);
  }, [fetchQr, isGenerating]);

  useEffect(() => {
    let cancelled = false;

    const initialize = async () => {
      const hasQr = await fetchQr();

      if (!hasQr && !bootstrappedRef.current && !cancelled) {
        bootstrappedRef.current = true;
        await createQr();
      }
    };

    initialize();
    return () => {
      cancelled = true;
    };
  }, [createQr, fetchQr]);

  const regenerate = async () => {
    await createQr();
  };

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-3xl uppercase tracking-[4px] text-primary">
        Office QR Code
      </h1>

      <div className="rounded-xl border border-border bg-surface p-6 text-center">
        <p className="text-xs uppercase tracking-[2px] text-text-muted">
          Active QR Code
        </p>
        {isLoading && (
          <p className="mt-4 text-sm text-text-muted">Loading active QR code...</p>
        )}

        {!isLoading && activeQr && (
          <div className="mt-4 flex flex-col items-center gap-3">
            <QRCodeCanvas value={activeQr.secret_token} size={240} />
            <p className="text-sm text-text-muted">
              Print and display this at your office entrance.
            </p>
            <p className="text-xs font-mono text-text-muted">
              Token: {activeQr.secret_token.slice(0, 6)}...{activeQr.secret_token.slice(-4)}
            </p>
          </div>
        )}

        {!isLoading && !activeQr && (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-text-muted">
              No active QR code exists yet. One will be created automatically.
            </p>
            <Button
              className="bg-primary text-background hover:bg-primary-dark"
              onClick={createQr}
              disabled={isGenerating}
            >
              {isGenerating ? "Generating..." : "Create QR Code"}
            </Button>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-surface p-4">
        <p className="text-sm text-text-muted">
          1. Print this QR code on paper
        </p>
        <p className="text-sm text-text-muted">
          2. Laminate it or put it in a frame
        </p>
        <p className="text-sm text-text-muted">
          3. Fix it near the office entrance
        </p>
        <p className="text-sm text-text-muted">
          4. All employees scan this to punch in/out
        </p>
      </div>

      <div className="rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm text-warning">
        Regenerating creates a new QR code. The old printed copy will stop
        working immediately.
      </div>

      <Button
        variant="outline"
        className="border-danger text-danger"
        onClick={() => setShowConfirm(true)}
        disabled={isGenerating}
      >
        Regenerate QR Code
      </Button>

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="bg-surface border-border">
          <h3 className="font-heading text-xl uppercase tracking-[3px] text-primary">
            Regenerate QR Code?
          </h3>
          <p className="text-sm text-text-muted">
            This will invalidate the current printed QR code.
          </p>
          <div className="mt-4 flex gap-2">
            <Button
              variant="outline"
              className="border-border text-text-primary"
              onClick={() => setShowConfirm(false)}
            >
              Cancel
            </Button>
            <Button
              className="bg-danger text-background hover:bg-danger/90"
              onClick={regenerate}
              disabled={isGenerating}
            >
              {isGenerating ? "Generating..." : "Regenerate"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
