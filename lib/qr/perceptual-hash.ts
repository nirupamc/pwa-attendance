/**
 * Perceptual Image Hash - Compare images visually
 * Used as a fallback when QR decode fails
 * 
 * Strategy:
 * 1. Resize image to small fixed size (8x8)
 * 2. Convert to grayscale
 * 3. Compute average brightness
 * 4. Create 64-bit hash: 1 if pixel > avg, 0 otherwise
 * 5. Compare hashes using Hamming distance
 */

export interface ImageHash {
  hash: string; // 64-bit binary string
  isValid: boolean;
}

/**
 * Compute perceptual hash of an image from canvas or video
 * Returns 64-character binary string
 */
export async function computeImageHash(
  source: HTMLCanvasElement | HTMLVideoElement
): Promise<ImageHash> {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 8;
    canvas.height = 8;

    const ctx = canvas.getContext("2d");
    if (!ctx) return { hash: "", isValid: false };

    // Draw source (canvas or video frame) onto small canvas
    if (source instanceof HTMLVideoElement) {
      ctx.drawImage(source, 0, 0, 8, 8);
    } else {
      ctx.drawImage(source, 0, 0, 8, 8);
    }

    // Get pixel data
    const imageData = ctx.getImageData(0, 0, 8, 8);
    const data = imageData.data;

    // Compute average brightness (R+G+B)/3 for each pixel
    let sum = 0;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      sum += (r + g + b) / 3;
    }
    const avg = sum / 64; // 64 pixels = 8x8

    // Build binary hash
    let hash = "";
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const brightness = (r + g + b) / 3;
      hash += brightness > avg ? "1" : "0";
    }

    return { hash, isValid: true };
  } catch (err) {
    console.error("[PHASH] Error computing hash:", err);
    return { hash: "", isValid: false };
  }
}

/**
 * Hamming distance between two hashes (0-64)
 * Lower = more similar
 */
export function hammingDistance(hash1: string, hash2: string): number {
  if (hash1.length !== 64 || hash2.length !== 64) return 64;

  let distance = 0;
  for (let i = 0; i < 64; i++) {
    if (hash1[i] !== hash2[i]) distance++;
  }
  return distance;
}

/**
 * Compare two image hashes
 * Returns similarity score 0-100 (100 = identical, 0 = completely different)
 * 
 * Threshold guideline:
 * - 85%+ = high confidence match (same QR code, possibly different angle/lighting)
 * - 75-85% = medium confidence (very similar but different QRs possible)
 * - <75% = low confidence (probably different images)
 */
export function compareHashes(hash1: string, hash2: string): number {
  const distance = hammingDistance(hash1, hash2);
  // 64 bits total, convert distance to similarity %
  const similarity = ((64 - distance) / 64) * 100;
  return Math.round(similarity);
}

/**
 * Compare image with hash threshold
 * Returns true if similarity >= threshold
 */
export function hashesMatch(
  hash1: string,
  hash2: string,
  threshold: number = 85
): boolean {
  return compareHashes(hash1, hash2) >= threshold;
}
