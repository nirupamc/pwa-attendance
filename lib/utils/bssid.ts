const BSSID_REGEX = /^([0-9a-f]{2}:){5}[0-9a-f]{2}$/;

export const normalizeBSSID = (value: string) => {
  const cleaned = value.replace(/[^0-9a-fA-F]/g, "").toLowerCase();
  const withColons = cleaned.match(/.{1,2}/g)?.join(":") ?? "";
  return withColons.slice(0, 17);
};

export const isValidBSSID = (value: string) => BSSID_REGEX.test(value);
