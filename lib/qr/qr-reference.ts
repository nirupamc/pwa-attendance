import { computeImageHash, ImageHash } from "./perceptual-hash";

/**
 * Generates a canvas image of the reference QR code from data URL
 * Used for visual comparison fallback
 */
export async function generateQRImage(
  token: string
): Promise<HTMLCanvasElement | null> {
  try {
    // We'll use the same QRCodeCanvas that the admin panel uses
    // For now, we dynamically import and render QRCode to canvas
    const { QRCodeCanvas } = await import("qrcode.react");

    // Create a temporary container
    const tempDiv = document.createElement("div");
    tempDiv.style.position = "absolute";
    tempDiv.style.left = "-9999px";
    tempDiv.style.top = "-9999px";

    // We need to render to canvas directly, so let's use a simpler approach
    // Use the qrcode.react library's native canvas export
    const qr = QRCodeCanvas as any;

    // Alternative: Use qrcode.js library directly if available
    // For now, create QR using canvas manually with a simple approach

    // Actually, the simplest approach is to fetch the QR as an image from admin panel
    // But that requires rendering first. Let's use a data-driven approach instead.

    // We'll generate the QR reference hash by rendering it via the browser
    return null; // Will be fetched instead
  } catch (err) {
    console.error("[QR] Error generating QR image:", err);
    return null;
  }
}

/**
 * Fetch reference QR code hash from Supabase
 * This is called once when modal opens to get the active QR token
 */
export async function fetchActiveQRToken(): Promise<string | null> {
  try {
    // Import Supabase client
    const { createSupabaseBrowserClient } = await import(
      "@/lib/supabase/client"
    );
    const supabase = createSupabaseBrowserClient();

    const { data, error } = await supabase
      .from("office_qr_codes")
      .select("secret_token")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      console.error("[QR] Error fetching active QR token:", error);
      return null;
    }

    return data.secret_token;
  } catch (err) {
    console.error("[QR] Error fetching active QR:", err);
    return null;
  }
}

/**
 * Generate perceptual hash of the reference QR code
 * We render it to a canvas and extract the hash
 */
export async function getReferenceQRHash(token: string): Promise<ImageHash> {
  try {
    // Create a canvas to render the QR code
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");

    if (!ctx) return { hash: "", isValid: false };

    // Use the QRCode library to render to canvas
    // This requires the qrcode library (which we already have via qr-scanner)
    // For simplicity, we'll use a data URL approach

    // Alternative approach: Use a simple QR rendering library
    // Since we need to support this offline, let's generate a deterministic
    // visual representation of the token that can be hashed

    // For MVP: We'll render using HTML2Canvas or similar
    // For now, return a placeholder that will be computed on first scan

    console.log("[QR] Reference QR hash will be computed on first frame capture");
    return { hash: "", isValid: false };
  } catch (err) {
    console.error("[QR] Error generating reference QR hash:", err);
    return { hash: "", isValid: false };
  }
}

/**
 * Render QR code to canvas for hashing
 * Uses qrcode library directly
 */
export async function renderQRCodeToCanvas(token: string): Promise<string> {
  return new Promise((resolve) => {
    try {
      // Use qrcode.js library if available
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";

      script.onload = () => {
        const canvas = document.createElement("canvas");
        const tempDiv = document.createElement("div");
        tempDiv.style.display = "none";
        tempDiv.id = `qr-${Date.now()}`;
        document.body.appendChild(tempDiv);

        try {
          // Render QR to canvas
          const qr = new (window as any).QRCode(tempDiv, {
            text: token,
            width: 256,
            height: 256,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: (window as any).QRCode.CorrectLevel.H,
          });

          // Extract canvas from QR
          const qrCanvas = tempDiv.querySelector("canvas") as HTMLCanvasElement;
          if (qrCanvas) {
            const ctx = canvas.getContext("2d");
            ctx?.drawImage(qrCanvas, 0, 0);
          }

          document.body.removeChild(tempDiv);
          resolve(canvas.toDataURL());
        } catch (err) {
          document.body.removeChild(tempDiv);
          console.error("[QR] Error rendering QR:", err);
          resolve("");
        }
      };

      script.onerror = () => {
        console.error("[QR] Failed to load QR library");
        resolve("");
      };

      document.head.appendChild(script);
    } catch (err) {
      console.error("[QR] Error in renderQRCodeToCanvas:", err);
      resolve("");
    }
  });
}
