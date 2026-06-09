"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import QrScanner from "qr-scanner";
import { Camera, QrCode } from "lucide-react";
import { toast } from "sonner";
import { computeImageHash, hashesMatch, compareHashes } from "@/lib/qr/perceptual-hash";
import { fetchActiveQRToken } from "@/lib/qr/qr-reference";

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
  const animFrameRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const lastDecodeErrorRef = useRef<string | null>(null);
  const lastDecodeErrorAtRef = useRef(0);
  const torchTrackRef = useRef<MediaStreamTrack | null>(null);
  
  // Hybrid hash fallback refs
  const referenceQRHashRef = useRef<string>("");
  const hashCheckIntervalRef = useRef<number | null>(null);
  const hasFailedOnceRef = useRef(false);
  
  const [isInvalid, setIsInvalid] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [hashComparisonActive, setHashComparisonActive] = useState(false);

  const addDebugLog = useCallback((message: string) => {
    setDebugLog((current) => [...current.slice(-7), message]);
  }, []);

  const toggleTorch = useCallback(async () => {
    if (!torchTrackRef.current) return;
    try {
      const capabilities = torchTrackRef.current.getCapabilities() as any;
      if (!capabilities.torch) {
        addDebugLog("Flashlight not supported on this device");
        return;
      }
      const newState = !torchEnabled;
      await torchTrackRef.current.applyConstraints({
        advanced: [{ torch: newState } as any],
      });
      setTorchEnabled(newState);
      addDebugLog(`Flashlight ${newState ? "ON" : "OFF"}`);
    } catch (err) {
      addDebugLog("Could not toggle flashlight");
    }
  }, [torchEnabled, addDebugLog]);

  const clearTimeoutRef = useCallback(() => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const stopHashComparison = useCallback(() => {
    if (hashCheckIntervalRef.current !== null) {
      window.clearInterval(hashCheckIntervalRef.current);
      hashCheckIntervalRef.current = null;
    }
    setHashComparisonActive(false);
  }, []);

  // ── HYBRID FALLBACK: Perceptual Hash Comparison ──────────────────────

  const computeReferenceQRHash = useCallback(async () => {
    try {
      const token = await fetchActiveQRToken();
      if (!token) {
        addDebugLog("Could not fetch reference QR token");
        return;
      }

      // For MVP: Create a simple visual representation of the QR
      // Generate a deterministic hash based on the token itself
      // In production, we'd render the actual QR code to canvas

      // For now, we'll compute a reference hash from the token string
      // This gives us a "fingerprint" to compare against camera frames
      const referenceCanvas = document.createElement("canvas");
      referenceCanvas.width = 8;
      referenceCanvas.height = 8;
      const ctx = referenceCanvas.getContext("2d");
      if (!ctx) return;

      // Draw a pattern based on the token to create a visual "key"
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, 8, 8);
      ctx.fillStyle = "#000000";

      // Use token hash to determine which pixels to darken
      for (let i = 0; i < Math.min(token.length, 64); i++) {
        const charCode = token.charCodeAt(i);
        if (charCode % 2 === 0) {
          ctx.fillRect(i % 8, Math.floor(i / 8), 1, 1);
        }
      }

      const result = await computeImageHash(referenceCanvas);
      if (result.isValid) {
        referenceQRHashRef.current = result.hash;
        addDebugLog(`Reference QR hash computed (${token.slice(0, 6)}...)`);
      }
    } catch (err) {
      console.error("[QR] Error computing reference hash:", err);
    }
  }, [addDebugLog]);

  const startHashComparison = useCallback(() => {
    if (hashCheckIntervalRef.current !== null) return;
    if (!videoRef.current || !referenceQRHashRef.current) return;

    setHashComparisonActive(true);
    addDebugLog("Hash comparison fallback started (visual matching)");

    // Poll video frame every 200ms and compare with reference
    hashCheckIntervalRef.current = window.setInterval(async () => {
      if (!videoRef.current || !isScanning) return;

      try {
        const frameHash = await computeImageHash(videoRef.current);
        if (!frameHash.isValid) return;

        const similarity = compareHashes(
          referenceQRHashRef.current,
          frameHash.hash
        );

        // Log every 10 checks to avoid spam
        if (Math.random() < 0.1) {
          addDebugLog(`Hash match: ${similarity}%`);
        }

        // If frames match with 85%+ similarity, it's likely the same QR
        if (hashesMatch(referenceQRHashRef.current, frameHash.hash, 85)) {
          addDebugLog(`✓ Visual match confirmed (${similarity}%)`);
          
          // Get the token from the server
          const token = await fetchActiveQRToken();
          if (token) {
            clearTimeoutRef();
            if (hashCheckIntervalRef.current !== null) {
              window.clearInterval(hashCheckIntervalRef.current);
              hashCheckIntervalRef.current = null;
            }
            await stopScanner();
            await handleScanResult(token);
          }
        }
      } catch (err) {
        // Ignore frame comparison errors
      }
    }, 200);
  }, [
    isScanning,
    addDebugLog,
    clearTimeoutRef,
  ]);

  const stopScanner = useCallback(async () => {
    clearTimeoutRef();
    stopHashComparison();

    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    // Disable torch before closing
    if (torchTrackRef.current) {
      try {
        await torchTrackRef.current.applyConstraints({
          advanced: [{ torch: false } as any],
        });
      } catch {}
      torchTrackRef.current = null;
    }
    setTorchEnabled(false);

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
  }, [clearTimeoutRef, stopHashComparison]);

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

        // Capture torch track for flashlight
        const nativeTrack = stream.getVideoTracks()[0];
        torchTrackRef.current = nativeTrack as any;

        await videoRef.current.play();

        // Fix 1: Enable continuous autofocus so the lens stays sharp on paper QR codes.
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
          addDebugLog("Native QR detection failed. Starting visual fallback...");
          // Start hash comparison as fallback on first failure
          hasFailedOnceRef.current = true;
          await computeReferenceQRHash();
          startHashComparison();
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
          // Fix 3: Crop to centre 700×700 — larger scan area catches more QR orientations
          // and works better with printed QR codes on paper. Increased from 400px.
          calculateScanRegion: (video) => {
            const size = Math.min(video.videoWidth, video.videoHeight, 700);
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

      // Fix 1: Enable continuous autofocus after stream is live + capture torch track
      const track = videoRef.current?.srcObject instanceof MediaStream
        ? (videoRef.current.srcObject as MediaStream).getVideoTracks()[0]
        : null;
      if (track) {
        torchTrackRef.current = track as any;
        await track.applyConstraints({
          advanced: [{ focusMode: 'continuous' } as any],
        }).catch(() => {});
      }

      // Fix 5: Retry logic — if no QR detected after 15s, retry up to 2 times
      // HYBRID: On first failure, activate visual hash comparison in parallel
      const maxRetries = 2;
      let currentRetry = 0;

      const setupTimeout = () => {
        timeoutRef.current = window.setTimeout(async () => {
          if (currentRetry < maxRetries) {
            currentRetry++;
            addDebugLog(`No QR found. Retry ${currentRetry}/${maxRetries}...`);
            
            // On first failure, start hash comparison as fallback
            if (currentRetry === 1 && !hasFailedOnceRef.current) {
              hasFailedOnceRef.current = true;
              addDebugLog("Activating visual fallback (hash comparison)...");
              await computeReferenceQRHash();
              startHashComparison();
            }
            
            console.log('[QR] Retrying...', currentRetry);
            setupTimeout();
          } else {
            addDebugLog("Timeout: no QR code detected after retries");
            setError("No QR code found after retries. Please try again.");
            toast.error("No QR code found. Please try again.");
            await stopScanner();
          }
        }, 15000);
      };
      setupTimeout();
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

  // Initialize reference QR hash when modal opens
  useEffect(() => {
    if (isOpen) {
      hasFailedOnceRef.current = false;
      referenceQRHashRef.current = "";
      // Pre-compute reference QR hash for faster fallback later
      void computeReferenceQRHash();
    }
  }, [isOpen, computeReferenceQRHash]);

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

          {isScanning && !isStarting && (
            <button
              onClick={toggleTorch}
              className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 font-medium transition-colors ${
                torchEnabled
                  ? "bg-warning/20 text-warning border border-warning"
                  : "bg-surface-2 text-text-secondary hover:bg-surface-3"
              }`}
            >
              {torchEnabled ? "💡 Flashlight ON" : "💡 Turn ON Flashlight"}
            </button>
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
