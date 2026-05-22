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

export type DeviceTrustResult = {
  trusted: boolean;
  code: "trusted" | "not_registered" | "not_trusted" | "pending_rebind" | "revoked";
  driftAccepted: boolean;
  normalizedProfile: FingerprintProfile;
  driftScore: number;
};

const normalizeString = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const cleaned = value.trim().toLowerCase();
  return cleaned.length > 0 ? cleaned : undefined;
};

const normalizeBool = (value: unknown): boolean | undefined =>
  typeof value === "boolean" ? value : undefined;

const normalizeNumber = (value: unknown): number | null | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

export const normalizeFingerprintProfile = (profile: unknown): FingerprintProfile => {
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
    touchSupport: normalizeBool(p.touchSupport),
    hardwareBucket: normalizeString(p.hardwareBucket),
    capabilityBucket: normalizeString(p.capabilityBucket),
  };
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

const driftAccepted = (
  stored: FingerprintProfile,
  incoming: FingerprintProfile
): { accepted: boolean; score: number } => {
  const checks: Array<boolean> = [
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
  const baseScore = checks.filter(Boolean).length;
  const score = isMinorBrowserDrift(stored, incoming) ? baseScore + 1 : baseScore;
  return { accepted: score >= 5, score };
};

const toHex = (bytes: Uint8Array): string =>
  [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");

export const hashDeviceToken = async (token: string): Promise<string> => {
  const pepper = Deno.env.get("DEVICE_SECURITY_PEPPER") ||
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!pepper) throw new Error("DEVICE_SECURITY_PEPPER is not configured.");
  const data = new TextEncoder().encode(`${pepper}:${token}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return toHex(new Uint8Array(digest));
};

export const safeEqualHex = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
};

export const evaluateDeviceTrust = async (params: {
  deviceStatus: string | null | undefined;
  storedTokenHash: string | null | undefined;
  storedFingerprintHash: string | null | undefined;
  storedProfile: unknown;
  incomingToken: string | null | undefined;
  incomingFingerprintHash: string | null | undefined;
  incomingProfile: unknown;
}): Promise<DeviceTrustResult> => {
  const status = params.deviceStatus ?? "active";
  const incomingProfile = normalizeFingerprintProfile(params.incomingProfile);
  const storedProfile = normalizeFingerprintProfile(params.storedProfile);

  if (status === "revoked") {
    return {
      trusted: false,
      code: "revoked",
      driftAccepted: false,
      normalizedProfile: incomingProfile,
      driftScore: 0,
    };
  }

  if (status === "pending_rebind") {
    return {
      trusted: false,
      code: "pending_rebind",
      driftAccepted: false,
      normalizedProfile: incomingProfile,
      driftScore: 0,
    };
  }

  if (!params.storedTokenHash) {
    return {
      trusted: false,
      code: "not_registered",
      driftAccepted: false,
      normalizedProfile: incomingProfile,
      driftScore: 0,
    };
  }

  if (!params.incomingToken || !params.incomingFingerprintHash) {
    return {
      trusted: false,
      code: "not_trusted",
      driftAccepted: false,
      normalizedProfile: incomingProfile,
      driftScore: 0,
    };
  }

  const incomingTokenHash = await hashDeviceToken(params.incomingToken);
  if (!safeEqualHex(params.storedTokenHash, incomingTokenHash)) {
    return {
      trusted: false,
      code: "not_trusted",
      driftAccepted: false,
      normalizedProfile: incomingProfile,
      driftScore: 0,
    };
  }

  if (params.storedFingerprintHash === params.incomingFingerprintHash) {
    return {
      trusted: true,
      code: "trusted",
      driftAccepted: false,
      normalizedProfile: incomingProfile,
      driftScore: 7,
    };
  }

  const drift = driftAccepted(storedProfile, incomingProfile);
  if (drift.accepted) {
    return {
      trusted: true,
      code: "trusted",
      driftAccepted: true,
      normalizedProfile: incomingProfile,
      driftScore: drift.score,
    };
  }

  return {
    trusted: false,
    code: "not_trusted",
    driftAccepted: false,
    normalizedProfile: incomingProfile,
    driftScore: drift.score,
  };
};

export const userFacingDeviceBlockedMessage = () =>
  "This account is registered on another trusted device.";
