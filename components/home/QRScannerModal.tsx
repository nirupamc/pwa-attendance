"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import QrScanner from "qr-scanner";
import { Camera, QrCode } from "lucide-react";
import { toast } from "sonner";

QrScanner.WORKER_PATH = "/qr-scanner-worker.min.js";

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
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const animFrameRef = useRef<number | null>(null); // BarcodeDetector rAF loop id
  const timeoutRef = useRef<number | null>(null);
  const lastDecodeErrorRef = useRef<string | null>(null);
  const lastDecodeErrorAtRef = useRef(0);
  const [isInvalid, setIsInvalid] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugLog, setDebugLog] = useState<string[]>([]);

  const addDebugLog = useCallback((message: string) => {
    setDebugLog((current) => [...current.slice(-7), message]);
  }, []);

  const clearTimeoutRef = useCallback(() => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const stopScanner = useCallback(async () => {
    clearTimeoutRef();

    // Cancel any running BarcodeDetector rAF loop
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    const scanner = scannerRef.current;
    scannerRef.current = null;

    try {
      scanner?.stop();
    } catch {
      // ignore teardown errors
    }

    try {
      scanner?.destroy();
    } catch {
      // ignore teardown errors
    }

    const video = videoRef.current;
    if (video) {
      try {
        video.pause();
      } catch {
        // ignore teardown errors
      }
      try {
        const mediaStream = video.srcObject as MediaStream | null;
        mediaStream?.getTracks().forEach((track) => track.stop());
      } catch {
        // ignore teardown errors
      }
      video.srcObject = null;
    }

    setIsScanning(false);
    setIsStarting(false);
  }, [clearTimeoutRef]);

  const handleScanResult = useCallback(
    async (token: string) => {
      try {
        setError(null);
        console.time('3_validate_qr_api');
        const res = await fetch("/api/validate-qr", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ secretToken: token }),
        });
        console.timeEnd('3_validate_qr_api');
        console.timeEnd('TOTAL_SCAN_FLOW');
        const payload = await res.json().catch(() => null);
        if (!res.ok || !payload?.valid) {
          setIsInvalid(true);
          setTimeout(() => setIsInvalid(false), 1000);
          setError("That QR code was not recognized as a valid office code.");
          return;
        }
        onVerified(token);
      } catch {
        console.timeEnd('3_validate_qr_api');
        console.timeEnd('TOTAL_SCAN_FLOW');
        setIsInvalid(true);
        setTimeout(() => setIsInvalid(false), 1000);
        setError("Unable to validate the QR code. Please try again.");
      }
    },
    [onVerified]
  );

  const handleCameraButtonTap = useCallback(async () => {
    setError(null);
    setDebugLog([]);
    lastDecodeErrorRef.current = null;
    lastDecodeErrorAtRef.current = 0;
    setIsStarting(true);

    console.time('TOTAL_SCAN_FLOW');
    console.time('1_camera_start');

    if (!videoRef.current) {
      setIsStarting(false);
      setError("Camera view is not ready yet. Please try again.");
      return;
    }

    try {
      if (scannerRef.current) {
        await stopScanner();
      }

      addDebugLog("Creating live QR scanner...");

      // ── Fix 2: Use native BarcodeDetector where available (Chrome/Android/Safari 17+).
      // Runs on the GPU-accelerated native stack — typically detects in <200ms.
      if ('BarcodeDetector' in window) {
        addDebugLog("Using native BarcodeDetector...");
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { exact: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 60 },
          },
          audio: false,
        });
        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        // Fix 1: Enable continuous autofocus so the lens stays sharp on paper QR codes.
        const nativeTrack = stream.getVideoTracks()[0];
        if (nativeTrack) {
          await nativeTrack.applyConstraints({
            advanced: [{ focusMode: 'continuous' } as any],
          }).catch(() => {});
        }

        setIsScanning(true);
        setIsStarting(false);
        console.timeEnd('1b_scanner_start');
        console.time('2_qr_detection');
        addDebugLog("Camera ready (native decoder). Looking for QR code...");

        const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
        const scan = async () => {
          // Bail out if stopScanner has already cleared the stream
          if (!videoRef.current?.srcObject) return;
          try {
            const results = await detector.detect(videoRef.current);
            if (results.length > 0) {
              console.timeEnd('2_qr_detection');
              console.log('[QR] Native hit:', results[0].rawValue.slice(0, 32));
              addDebugLog(`QR detected: ${results[0].rawValue.slice(0, 24)}...`);
              clearTimeoutRef();
              animFrameRef.current = null;
              await stopScanner();
              await handleScanResult(results[0].rawValue);
              return;
            }
          } catch {}
          // Only re-queue if the scanner hasn't been stopped
          if (videoRef.current?.srcObject) {
            animFrameRef.current = requestAnimationFrame(scan);
          }
        };
        animFrameRef.current = requestAnimationFrame(scan);

        timeoutRef.current = window.setTimeout(async () => {
          addDebugLog("Timeout: no QR code detected after 15 seconds");
          setError("No QR code found after 15 seconds. Please try again.");
          toast.error("No QR code found after 15 seconds. Please try again.");
          await stopScanner();
        }, 15000);
        return; // skip QrScanner construction
      }

      // ── Fallback: ZXing-based QrScanner for Firefox and older Safari.
      const scanner = new QrScanner(
        videoRef.current,
        async (result) => {
          console.timeEnd('1_camera_start');
          console.timeEnd('2_qr_detection');
          console.log('[QR] Token length:', result.data.length, '| Preview:', result.data.slice(0, 32));
          addDebugLog(
            `QR detected: ${result.data.slice(0, 24)}${result.data.length > 24 ? "..." : ""}`
          );
          clearTimeoutRef();
          await stopScanner();
          await handleScanResult(result.data);
        },
        {
          preferredCamera: "environment",
          // Fix 3: Crop to centre 400×400 — QR codes are small, scanning the full
          // frame wastes cycles and the centre crop is where users naturally aim.
          calculateScanRegion: (video) => {
            const size = Math.min(video.videoWidth, video.videoHeight, 400);
            return {
              x: Math.round((video.videoWidth - size) / 2),
              y: Math.round((video.videoHeight - size) / 2),
              width: size,
              height: size,
              downScaledWidth: size,
              downScaledHeight: size,
            };
          },
          highlightScanRegion: true,
          highlightCodeOutline: true,
          maxScansPerSecond: 25, // Fix 4: was 12
          returnDetailedScanResult: true,
          onDecodeError: (decodeError) => {
            const message =
              typeof decodeError === "string" ? decodeError : decodeError.message;
            const now = Date.now();
            if (
              message !== lastDecodeErrorRef.current ||
              now - lastDecodeErrorAtRef.current > 1500
            ) {
              lastDecodeErrorRef.current = message;
              lastDecodeErrorAtRef.current = now;
              addDebugLog(`Decode loop: ${message}`);
            }
          },
        }
      );

      scannerRef.current = scanner;
      setIsScanning(true);
      setIsStarting(false);
      addDebugLog("Starting camera stream...");
      console.time('1b_scanner_start');
      await scanner.start();
      console.timeEnd('1b_scanner_start');
      console.time('2_qr_detection');
      addDebugLog("Camera stream started. Looking for QR code...");

      // Fix 1: Enable continuous autofocus after stream is live.
      const track = videoRef.current?.srcObject instanceof MediaStream
        ? (videoRef.current.srcObject as MediaStream).getVideoTracks()[0]
        : null;
      if (track) {
        await track.applyConstraints({
          advanced: [{ focusMode: 'continuous' } as any],
        }).catch(() => {});
      }

      timeoutRef.current = window.setTimeout(async () => {
        addDebugLog("Timeout: no QR code detected after 15 seconds");
        setError("No QR code found after 15 seconds. Please try again.");
        toast.error("No QR code found after 15 seconds. Please try again.");
        await stopScanner();
      }, 15000);
    } catch (err: any) {
      await stopScanner();
      setIsStarting(false);
      const message = err?.message || String(err || "Unknown error");
      addDebugLog(`Camera start failed: ${message}`);
      setError("Could not start the live camera scanner. Please try again.");
      toast.error("Could not start the live camera scanner. Please try again.");
    }
  }, [addDebugLog, clearTimeoutRef, handleScanResult, stopScanner]);

  useEffect(() => {
    if (!isOpen) {
      void stopScanner();
      setError(null);
      setDebugLog([]);
      setIsInvalid(false);
      setIsStarting(false);
      return;
    }

    const autoStartTimer = window.setTimeout(() => {
      if (!scannerRef.current) {
        void handleCameraButtonTap();
      }
    }, 100);

    return () => {
      window.clearTimeout(autoStartTimer);
    };
  }, [handleCameraButtonTap, isOpen, stopScanner]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-background">
      <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col gap-6 px-4 py-6">
        <div className="flex flex-col items-center justify-center gap-6 rounded-3xl border border-border bg-background p-4 shadow-xl">
          <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-primary bg-surface-2">
            <QrCode className="h-12 w-12 text-primary" />
          </div>

          <div className="text-center">
            <p className="mb-2 text-lg font-semibold text-text-primary">
              Scan Office QR Code
            </p>
            <p className="text-sm leading-relaxed text-text-muted">
              Point your camera at the QR code displayed at your office entrance.
            </p>
          </div>

          <div className="w-full rounded-xl bg-surface-2 p-4 space-y-2">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-text-muted">
              Tips for best results
            </p>
            <p className="text-xs text-text-muted">📏 Hold phone 20–30cm from QR code</p>
            <p className="text-xs text-text-muted">💡 Make sure QR code is well lit</p>
            <p className="text-xs text-text-muted">🔲 Keep the entire QR code in frame</p>
          </div>

          {isInvalid && (
            <div className="w-full rounded-xl border border-danger bg-danger/10 p-3">
              <p className="text-center text-sm text-danger">Invalid QR code. Please try again.</p>
            </div>
          )}

          {error && (
            <div className="w-full rounded-xl border border-danger bg-danger/10 p-3">
              <p className="text-center text-sm text-danger">{error}</p>
            </div>
          )}

          <div className="w-full overflow-hidden rounded-2xl border border-border bg-black">
            <div className="relative h-[42vh] min-h-[280px] w-full bg-black">
              <video
                ref={videoRef}
                className="h-full w-full object-cover"
                autoPlay
                muted
                playsInline
              />
              {(!isScanning || isStarting) && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/70 px-6 text-center">
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-text-primary">
                      {isStarting ? "Opening camera..." : "Camera is idle."}
                    </p>
                    <p className="text-xs text-text-muted">
                      {isStarting
                        ? "Grant camera permission and point at the QR code."
                        : "Tap start to open the live scanner and watch for a QR code."}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {!isScanning || isStarting ? (
            <button
              onClick={handleCameraButtonTap}
              className="flex w-full items-center justify-center gap-3 rounded-xl bg-primary py-4 text-lg font-bold text-background transition-colors active:bg-primary-dark"
            >
              <Camera className="h-6 w-6" />
              {isStarting ? "Opening Camera..." : "Start Live QR Scan"}
            </button>
          ) : (
            <div className="flex w-full items-center justify-center gap-3 rounded-xl bg-surface-2 py-4">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span className="text-text-muted">Scanning live camera feed...</span>
            </div>
          )}

          {debugLog.length > 0 && (
            <div className="w-full rounded-xl border border-border bg-surface-2 p-3 font-mono text-[11px] leading-5 text-text-muted">
              {debugLog.map((line, index) => (
                <div key={`${line}-${index}`}>{line}</div>
              ))}
            </div>
          )}

          <button
            onClick={async () => {
              await stopScanner();
              onClose();
            }}
            className="text-sm text-text-muted underline underline-offset-2"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
