import { createHash, timingSafeEqual } from "crypto";

export type DeviceStatus = "active" | "pending_rebind" | "revoked";

export type FingerprintProfile = {
  timezone?: string;
  language?: string;
  platform?: string;
  browserFamily?: string;
  browserMajor?: number | null;
  screenBucket?: string;
  touchSupport?: boolean;
  hardwareBucket?: string;
  capabilityBucket?: string;
};

export type DeviceTrustCode =
  | "trusted"
  | "not_registered"
  | "not_trusted"
  | "pending_rebind"
  | "revoked";

export type DeviceTrustResult = {
  trusted: boolean;
  code: DeviceTrustCode;
  userMessage: string;
  driftAccepted: boolean;
  normalizedProfile: FingerprintProfile;
  driftScore: number;
};

const TRUSTED_MESSAGE = "Trusted device verified.";
const BLOCKED_MESSAGE = "This account is registered on another trusted device.";

const normalizeString = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const cleaned = value.trim().toLowerCase();
  return cleaned.length > 0 ? cleaned : undefined;
};

const normalizeBoolean = (value: unknown): boolean | undefined => {
  if (typeof value === "boolean") return value;
  return undefined;
};

const normalizeNumber = (value: unknown): number | null | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return undefined;
};

export const normalizeFingerprintProfile = (
  profile: unknown
): FingerprintProfile => {
  const p = (profile ?? {}) as Record<string, unknown>;
  return {
    timezone: normalizeString(p.timezone),
    language: normalizeString(p.language),
    platform: normalizeString(p.platform),
    browserFamily: normalizeString(p.browserFamily),
    browserMajor:
      normalizeNumber(p.browserMajor) === undefined
        ? null
        : (normalizeNumber(p.browserMajor) as number),
    screenBucket: normalizeString(p.screenBucket),
    touchSupport: normalizeBoolean(p.touchSupport),
    hardwareBucket: normalizeString(p.hardwareBucket),
    capabilityBucket: normalizeString(p.capabilityBucket),
  };
};

const getPepper = (): string => {
  const pepper = process.env.DEVICE_SECURITY_PEPPER?.trim();
  if (pepper) return pepper;
  const fallback = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (fallback) return fallback;
  throw new Error("DEVICE_SECURITY_PEPPER is not configured.");
};

export const hashDeviceToken = (token: string): string => {
  const pepper = getPepper();
  return createHash("sha256").update(`${pepper}:${token}`).digest("hex");
};

export const safeEqualHex = (a: string, b: string): boolean => {
  try {
    const ba = Buffer.from(a, "hex");
    const bb = Buffer.from(b, "hex");
    if (ba.length !== bb.length) return false;
    return timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
};

const isMinorBrowserDrift = (
  stored: FingerprintProfile,
  incoming: FingerprintProfile
): boolean => {
  if (!stored.browserFamily || !incoming.browserFamily) return false;
  if (stored.browserFamily !== incoming.browserFamily) return false;
  const s = stored.browserMajor;
  const i = incoming.browserMajor;
  if (typeof s !== "number" || typeof i !== "number") return false;
  return Math.abs(s - i) <= 1;
};

const fingerprintDriftAccepted = (
  stored: FingerprintProfile,
  incoming: FingerprintProfile
): { accepted: boolean; score: number } => {
  const stableChecks: Array<boolean> = [
    Boolean(stored.timezone && incoming.timezone && stored.timezone === incoming.timezone),
    Boolean(stored.language && incoming.language && stored.language === incoming.language),
    Boolean(stored.platform && incoming.platform && stored.platform === incoming.platform),
    Boolean(
      stored.screenBucket &&
        incoming.screenBucket &&
        stored.screenBucket === incoming.screenBucket
    ),
    Boolean(
      typeof stored.touchSupport === "boolean" &&
        typeof incoming.touchSupport === "boolean" &&
        stored.touchSupport === incoming.touchSupport
    ),
    Boolean(
      stored.hardwareBucket &&
        incoming.hardwareBucket &&
        stored.hardwareBucket === incoming.hardwareBucket
    ),
    Boolean(
      stored.capabilityBucket &&
        incoming.capabilityBucket &&
        stored.capabilityBucket === incoming.capabilityBucket
    ),
  ];

  const baseScore = stableChecks.filter(Boolean).length;
  const score = isMinorBrowserDrift(stored, incoming) ? baseScore + 1 : baseScore;
  return { accepted: score >= 5, score };
};

export const evaluateDeviceTrust = (params: {
  deviceStatus: DeviceStatus | null | undefined;
  storedTokenHash: string | null | undefined;
  storedFingerprintHash: string | null | undefined;
  storedProfile: unknown;
  incomingToken: string | null | undefined;
  incomingFingerprintHash: string | null | undefined;
  incomingProfile: unknown;
}): DeviceTrustResult => {
  const status = (params.deviceStatus ?? "active") as DeviceStatus;
  const incomingProfile = normalizeFingerprintProfile(params.incomingProfile);
  const storedProfile = normalizeFingerprintProfile(params.storedProfile);

  if (status === "revoked") {
    return {
      trusted: false,
      code: "revoked",
      userMessage: BLOCKED_MESSAGE,
      driftAccepted: false,
      normalizedProfile: incomingProfile,
      driftScore: 0,
    };
  }

  if (status === "pending_rebind") {
    return {
      trusted: false,
      code: "pending_rebind",
      userMessage: BLOCKED_MESSAGE,
      driftAccepted: false,
      normalizedProfile: incomingProfile,
      driftScore: 0,
    };
  }

  if (!params.storedTokenHash) {
    return {
      trusted: false,
      code: "not_registered",
      userMessage: "Device is not registered yet.",
      driftAccepted: false,
      normalizedProfile: incomingProfile,
      driftScore: 0,
    };
  }

  if (!params.incomingToken || !params.incomingFingerprintHash) {
    return {
      trusted: false,
      code: "not_trusted",
      userMessage: BLOCKED_MESSAGE,
      driftAccepted: false,
      normalizedProfile: incomingProfile,
      driftScore: 0,
    };
  }

  const incomingTokenHash = hashDeviceToken(params.incomingToken);
  if (!safeEqualHex(params.storedTokenHash, incomingTokenHash)) {
    return {
      trusted: false,
      code: "not_trusted",
      userMessage: BLOCKED_MESSAGE,
      driftAccepted: false,
      normalizedProfile: incomingProfile,
      driftScore: 0,
    };
  }

  if (params.storedFingerprintHash === params.incomingFingerprintHash) {
    return {
      trusted: true,
      code: "trusted",
      userMessage: TRUSTED_MESSAGE,
      driftAccepted: false,
      normalizedProfile: incomingProfile,
      driftScore: 7,
    };
  }

  const drift = fingerprintDriftAccepted(storedProfile, incomingProfile);
  if (drift.accepted) {
    return {
      trusted: true,
      code: "trusted",
      userMessage: TRUSTED_MESSAGE,
      driftAccepted: true,
      normalizedProfile: incomingProfile,
      driftScore: drift.score,
    };
  }

  return {
    trusted: false,
    code: "not_trusted",
    userMessage: BLOCKED_MESSAGE,
    driftAccepted: false,
    normalizedProfile: incomingProfile,
    driftScore: drift.score,
  };
};

export const getClientIpFromHeaders = (headers: Headers): string | null => {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip") || headers.get("cf-connecting-ip") || null;
};

export const userFacingDeviceBlockedMessage = () => BLOCKED_MESSAGE;
