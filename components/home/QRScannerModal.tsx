"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BarcodeFormat,
  BrowserMultiFormatReader,
  DecodeHintType,
  NotFoundException,
} from "@zxing/library";
import jsQR from "jsqr";
import { toast } from "sonner";

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerified: (token: string) => void;
}

export const QRScannerModal = ({
  isOpen,
  onClose,
  onVerified,
}: QRScannerModalProps) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const isInitializedRef = useRef(false);
  const isVerifyingRef = useRef(false);
  const debugLogRef = useRef<string[]>([]);
  const onVerifiedRef = useRef(onVerified);
  const fallbackLoopRef = useRef<number | null>(null);
  const fallbackTimerRef = useRef<number | null>(null);
  const [isInvalid, setIsInvalid] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [debugLog, setDebugLog] = useState<string[]>([]);

  const addLog = useCallback((message: string) => {
    debugLogRef.current = [...debugLogRef.current.slice(-4), message];
    setDebugLog([...debugLogRef.current]);
  }, []);

  useEffect(() => {
    onVerifiedRef.current = onVerified;
  }, [onVerified]);

  useEffect(() => {
    if (isOpen) {
      setIsInvalid(false);
      setCameraError(null);
      isVerifyingRef.current = false;
      debugLogRef.current = [];
      setDebugLog([]);
      isInitializedRef.current = false;
      addLog("Modal opened");
    }
  }, [addLog, isOpen]);

  const verifyToken = useCallback(
    async (token: string) => {
      if (isVerifyingRef.current) return;
      isVerifyingRef.current = true;

      try {
        addLog(`QR detected: ${token.slice(0, 20)}`);
        addLog("Calling validate-qr...");
        const res = await fetch("/api/validate-qr", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ secretToken: token }),
        });
        const payload = await res.json().catch(() => null);
        addLog(
          `validate-qr response: ${JSON.stringify({
            ok: res.ok,
            status: res.status,
            valid: payload?.valid,
          })}`
        );
        if (!res.ok || !payload?.valid) {
          setIsInvalid(true);
          setTimeout(() => setIsInvalid(false), 1000);
          return;
        }
        addLog("QR validated");
        onVerifiedRef.current(token);
      } catch {
        addLog("QR validation failed");
        setIsInvalid(true);
        setTimeout(() => setIsInvalid(false), 1000);
      } finally {
        isVerifyingRef.current = false;
      }
    },
    [addLog]
  );

  useEffect(() => {
    if (!isOpen) return;
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE]);
    hints.set(DecodeHintType.TRY_HARDER, true);
    hints.set("ALSO_INVERTED" as unknown as DecodeHintType, true);

    const codeReader = new BrowserMultiFormatReader(hints);
    codeReaderRef.current = codeReader;
    const videoElement = videoRef.current;

    const timer = window.setTimeout(async () => {
      try {
        if (!videoElement) {
          addLog("Error: video element not ready");
          return;
        }

        addLog("Requesting camera...");
        addLog("ZXing: decodeFromVideoDeviceContinuously called");

        codeReader.decodeFromVideoDevice(
          null,
          videoElement,
          (result, error) => {
            if (result) {
              void verifyToken(result.getText());
              return;
            }

            if (error && !(error instanceof NotFoundException)) {
              addLog(`ZXing error: ${error.message}`);
            }
          }
        );

        addLog("Camera started");
      } catch (err: any) {
        const message = err?.message ?? "Camera failed";
        setCameraError(message);
        addLog(`Camera failed: ${message}`);
        toast.error("Camera access required to scan QR code: " + message);
      }
    }, 300);

    return () => {
      window.clearTimeout(timer);
      isInitializedRef.current = false;
      addLog("Scanner cleaned up");
      codeReaderRef.current?.reset();
      codeReaderRef.current = null;
      if (videoElement && videoElement.srcObject) {
        const tracks = (videoElement.srcObject as MediaStream).getTracks();
        tracks.forEach((track) => track.stop());
        videoElement.srcObject = null;
      }
    };
  }, [addLog, isOpen, verifyToken]);

  useEffect(() => {
    if (!isOpen) return;

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { willReadFrequently: true });
    let lastScanAt = 0;

    const scanFrame = () => {
      if (!isOpen || isVerifyingRef.current) return;

      const videoElement = videoRef.current;
      if (!videoElement || !context) {
        fallbackLoopRef.current = window.requestAnimationFrame(scanFrame);
        return;
      }

      if (videoElement.readyState < 2 || videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
        fallbackLoopRef.current = window.requestAnimationFrame(scanFrame);
        return;
      }

      const now = window.performance.now();
      if (now - lastScanAt < 180) {
        fallbackLoopRef.current = window.requestAnimationFrame(scanFrame);
        return;
      }
      lastScanAt = now;

      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;
      context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "attemptBoth",
      });

      if (code?.data) {
        addLog(`Canvas QR detected: ${code.data.slice(0, 20)}`);
        void verifyToken(code.data);
        return;
      }

      fallbackLoopRef.current = window.requestAnimationFrame(scanFrame);
    };

    fallbackTimerRef.current = window.setTimeout(() => {
      fallbackLoopRef.current = window.requestAnimationFrame(scanFrame);
    }, 600);

    return () => {
      if (fallbackTimerRef.current) {
        window.clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
      if (fallbackLoopRef.current) {
        window.cancelAnimationFrame(fallbackLoopRef.current);
        fallbackLoopRef.current = null;
      }
    };
  }, [addLog, isOpen, verifyToken]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="relative flex-1">
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          autoPlay
          controls={false}
          playsInline
          muted
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative h-64 w-64 border border-primary">
            <span className="absolute left-0 top-0 h-4 w-4 border-l-2 border-t-2 border-primary" />
            <span className="absolute right-0 top-0 h-4 w-4 border-r-2 border-t-2 border-primary" />
            <span className="absolute bottom-0 left-0 h-4 w-4 border-b-2 border-l-2 border-primary" />
            <span className="absolute bottom-0 right-0 h-4 w-4 border-b-2 border-r-2 border-primary" />
            <span className="absolute left-0 right-0 top-0 h-0.5 bg-primary animate-pulse" />
          </div>
        </div>
        {isInvalid && (
          <div className="absolute inset-0 bg-danger/40" />
        )}
        {cameraError && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="rounded-xl bg-surface p-4 text-sm text-danger">
              <p>Camera error: {cameraError}</p>
              <p className="mt-2 text-xs text-text-muted">Ensure the site has camera permission and is served over HTTPS (or installed as a PWA).</p>
            </div>
          </div>
        )}
        <div className="absolute bottom-20 left-0 right-0 z-50 max-h-32 overflow-y-auto bg-black/80 p-2 text-xs font-mono text-yellow-400">
          {debugLog.map((log, index) => (
            <div key={index}>{log}</div>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-border bg-surface px-6 py-4">
        <p className="text-sm text-text-muted">
          Point camera at office QR code
        </p>
        <button
          onClick={onClose}
          className="text-sm uppercase tracking-[2px] text-text-muted"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};
