"use client";

import FingerprintJS, { type Agent } from "@fingerprintjs/fingerprintjs";

const DEVICE_TOKEN_KEY = "tt_device_token_v1";

type DevicePayload = {
  deviceToken: string;
  fingerprintHash: string;
  fingerprintProfile: Record<string, unknown>;
  deviceName: string;
  deviceBrowser: string;
  devicePlatform: string;
};

let fpPromise: Promise<Agent> | null = null;

const getAgent = () => {
  if (!fpPromise) fpPromise = FingerprintJS.load();
  return fpPromise;
};

const parseUserAgent = (ua: string) => {
  const lower = ua.toLowerCase();

  const browser =
    lower.includes("edg/")
      ? "Edge"
      : lower.includes("chrome/") && !lower.includes("edg/")
      ? "Chrome"
      : lower.includes("safari/") && !lower.includes("chrome/")
      ? "Safari"
      : lower.includes("firefox/")
      ? "Firefox"
      : "Unknown";

  const majorMatch =
    ua.match(/Edg\/(\d+)/) ||
    ua.match(/Chrome\/(\d+)/) ||
    ua.match(/Version\/(\d+)/) ||
    ua.match(/Firefox\/(\d+)/);
  const major = majorMatch ? Number(majorMatch[1]) : null;

  return { browserFamily: browser, browserMajor: major };
};

const bucket = (value: number, boundaries: number[]) => {
  for (const boundary of boundaries) {
    if (value <= boundary) return `<=${boundary}`;
  }
  return `>${boundaries[boundaries.length - 1]}`;
};

const getWebGLRenderer = () => {
  try {
    const canvas = document.createElement("canvas");
    const gl =
      (canvas.getContext("webgl") as WebGLRenderingContext | null) ||
      (canvas.getContext("experimental-webgl") as WebGLRenderingContext | null);
    if (!gl) return "none";
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    if (!ext) return "unknown";
    const renderer = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL);
    return typeof renderer === "string" ? renderer.toLowerCase() : "unknown";
  } catch {
    return "unknown";
  }
};

const getOrCreateDeviceToken = () => {
  const existing = localStorage.getItem(DEVICE_TOKEN_KEY);
  if (existing && existing.length >= 16) return existing;

  const token =
    typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random()
          .toString(36)
          .slice(2)}`;
  localStorage.setItem(DEVICE_TOKEN_KEY, token);
  return token;
};

export const clearDeviceSecurityCache = () => {
  localStorage.removeItem(DEVICE_TOKEN_KEY);
};

const getPlatformName = () => {
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "iOS";
  if (ua.includes("android")) return "Android";
  if (ua.includes("windows")) return "Windows";
  if (ua.includes("mac os")) return "macOS";
  if (ua.includes("linux")) return "Linux";
  return "Unknown";
};

const getFingerprintProfile = () => {
  const ua = navigator.userAgent;
  const { browserFamily, browserMajor } = parseUserAgent(ua);
  const screenBucket = `${bucket(window.screen.width, [390, 430, 768, 1024, 1440])}x${bucket(
    window.screen.height,
    [844, 932, 1024, 1366, 1920, 2560]
  )}`;
  const hardware = navigator.hardwareConcurrency ?? 0;
  const hwBucket = bucket(hardware, [2, 4, 6, 8, 12]);

  const capabilities = [
    "sw:" + ("serviceWorker" in navigator ? "1" : "0"),
    "touch:" + ("maxTouchPoints" in navigator && navigator.maxTouchPoints > 0 ? "1" : "0"),
    "cookies:" + (navigator.cookieEnabled ? "1" : "0"),
    "standalone:" + ((window.matchMedia?.("(display-mode: standalone)")?.matches || false) ? "1" : "0"),
    "webgl:" + (getWebGLRenderer() !== "none" ? "1" : "0"),
  ].join("|");

  return {
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone?.toLowerCase() ?? "unknown",
    language: (navigator.language || "unknown").toLowerCase(),
    platform: getPlatformName().toLowerCase(),
    browserFamily: browserFamily.toLowerCase(),
    browserMajor,
    screenBucket: screenBucket.toLowerCase(),
    touchSupport: ("maxTouchPoints" in navigator && navigator.maxTouchPoints > 0) || false,
    hardwareBucket: hwBucket.toLowerCase(),
    capabilityBucket: capabilities.toLowerCase(),
  };
};

export const getDeviceSecurityPayload = async (): Promise<DevicePayload> => {
  const [agent, profile] = await Promise.all([getAgent(), Promise.resolve(getFingerprintProfile())]);
  const fpResult = await agent.get();
  const deviceToken = getOrCreateDeviceToken();

  const browser = profile.browserFamily
    ? `${profile.browserFamily}${typeof profile.browserMajor === "number" ? ` ${profile.browserMajor}` : ""}`
    : "unknown";
  const platform = profile.platform || "unknown";

  return {
    deviceToken,
    fingerprintHash: fpResult.visitorId,
    fingerprintProfile: profile,
    deviceName: `${platform} ${browser}`.trim(),
    deviceBrowser: browser,
    devicePlatform: platform,
  };
};
