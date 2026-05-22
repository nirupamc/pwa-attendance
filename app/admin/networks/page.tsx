"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  MapPin,
  RefreshCw,
  Wifi,
} from "lucide-react";
import { toast } from "sonner";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { OfficeConfig } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const IPV4_REGEX = /^(\d{1,3}\.){3}\d{1,3}$/;

const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
};

type Mode = "view" | "detect" | "manual";

export default function NetworksPage() {
  const [config, setConfig] = useState<OfficeConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<Mode>("view");
  const [detectedIP, setDetectedIP] = useState<string | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [ipInput, setIpInput] = useState("");
  const [label, setLabel] = useState("Main Office");
  const [latInput, setLatInput] = useState("");
  const [lngInput, setLngInput] = useState("");
  const [radiusInput, setRadiusInput] = useState("200");
  const [geofenceEnabled, setGeofenceEnabled] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchConfig = async () => {
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase
      .from("office_config")
      .select("*")
      .eq("is_active", true)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setConfig((data as OfficeConfig | null) ?? null);
    setLoading(false);
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const startConfigure = () => {
    setMode("detect");
    setDetectedIP(null);
    setIpInput("");
    setLabel(config?.label ?? "Main Office");
    setLatInput(config?.office_latitude?.toString() ?? "");
    setLngInput(config?.office_longitude?.toString() ?? "");
    setRadiusInput(config?.allowed_radius_meters?.toString() ?? "200");
    setGeofenceEnabled(config?.geofence_enabled ?? false);
  };

  const handleDetect = async () => {
    setDetecting(true);
    try {
      const res = await fetch("/api/get-ip");
      const json = await res.json();
      if (json?.ip && json.ip !== "unknown") {
        setDetectedIP(json.ip);
      } else {
        toast.error("Could not detect your IP. Please enter manually.");
        setMode("manual");
      }
    } catch {
      toast.error("Could not detect your IP. Please enter manually.");
      setMode("manual");
    } finally {
      setDetecting(false);
    }
  };

  const handleConfirmDetected = () => {
    if (!detectedIP) return;
    setIpInput(detectedIP);
    setMode("manual");
  };

  const isValidIP = IPV4_REGEX.test(ipInput.trim());

  const handleSave = async () => {
    if (!isValidIP) {
      toast.error("Please enter a valid IPv4 address.");
      return;
    }
    if (!label.trim()) {
      toast.error("Please enter a network label.");
      return;
    }
    setSaving(true);
    const supabase = createSupabaseBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const payload = {
      label: label.trim(),
      public_ip: ipInput.trim(),
      is_active: true,
      added_by: user?.id ?? null,
      updated_at: new Date().toISOString(),
      office_latitude: latInput.trim() ? parseFloat(latInput.trim()) : null,
      office_longitude: lngInput.trim() ? parseFloat(lngInput.trim()) : null,
      allowed_radius_meters: parseInt(radiusInput.trim() || "200", 10),
      geofence_enabled: geofenceEnabled,
    };

    let error;
    if (config) {
      ({ error } = await supabase
        .from("office_config")
        .update(payload)
        .eq("id", config.id));
    } else {
      ({ error } = await supabase.from("office_config").insert(payload));
    }

    setSaving(false);

    if (error) {
      toast.error("Unable to save office IP. " + error.message);
      return;
    }
    toast.success(
      "Office IP saved ✓ Employees can now punch in from office WiFi.",
    );
    setMode("view");
    setDetectedIP(null);
    setIpInput("");
    fetchConfig();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl uppercase tracking-[4px] text-primary">
          Office Network
        </h1>
        <p className="text-sm text-text-muted">
          Configure your office public IP for server-side punch verification.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-text-muted">
          <Loader2 className="animate-spin" size={18} />
          Loading…
        </div>
      ) : config && mode === "view" ? (
        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-success/10 p-2 text-success">
              <CheckCircle2 size={22} />
            </div>
            <div className="flex-1">
              <h2 className="font-heading text-xl uppercase tracking-[3px] text-success">
                Office Network Configured
              </h2>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-text-muted">Label</dt>
                  <dd className="text-text-primary">{config.label}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-text-muted">Public IP</dt>
                  <dd className="font-mono text-text-primary">
                    {config.public_ip}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-text-muted">Last updated</dt>
                  <dd className="text-text-primary">
                    {formatDate(config.updated_at)}
                  </dd>
                </div>
                {config.geofence_enabled && (
                  <>
                    <div className="flex justify-between">
                      <dt className="text-text-muted">Geofence</dt>
                      <dd className="text-success">Enabled</dd>
                    </div>
                    {config.office_latitude != null && (
                      <div className="flex justify-between">
                        <dt className="text-text-muted">Coords</dt>
                        <dd className="font-mono text-text-primary text-xs">
                          {config.office_latitude.toFixed(6)},{" "}
                          {config.office_longitude?.toFixed(6)}
                        </dd>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <dt className="text-text-muted">Radius</dt>
                      <dd className="text-text-primary">
                        {config.allowed_radius_meters ?? 200} m
                      </dd>
                    </div>
                  </>
                )}
                {!config.geofence_enabled && (
                  <div className="flex justify-between">
                    <dt className="text-text-muted">Geofence</dt>
                    <dd className="text-text-muted">Observe mode (disabled)</dd>
                  </div>
                )}
              </dl>
              <Button
                className="mt-4 bg-primary text-background hover:bg-primary-dark"
                onClick={startConfigure}
              >
                <RefreshCw size={16} className="mr-2" />
                Update IP
              </Button>
            </div>
          </div>
        </div>
      ) : !config && mode === "view" ? (
        <div className="rounded-xl border border-warning/40 bg-surface p-6 text-center">
          <div className="flex items-center justify-center">
            <AlertTriangle className="text-warning" size={36} />
          </div>
          <p className="mt-2 font-heading text-lg uppercase tracking-[3px] text-warning">
            No Office Network Configured
          </p>
          <p className="text-sm text-text-muted">
            Employees cannot punch in until you save the office public IP
            address.
          </p>
          <Button
            className="mt-4 bg-primary text-background hover:bg-primary-dark"
            onClick={startConfigure}
          >
            Configure Now
          </Button>
        </div>
      ) : null}

      {mode !== "view" && (
        <div className="space-y-4 rounded-xl border border-border bg-surface p-5">
          <h2 className="font-heading text-xl uppercase tracking-[3px] text-primary">
            {config ? "Update Office IP" : "Configure Office IP"}
          </h2>

          {mode === "detect" && (
            <div className="space-y-3">
              <p className="text-sm text-text-muted">
                Make sure this device is connected to the office WiFi, then
                detect your current public IP.
              </p>
              <Button
                variant="outline"
                className="border-primary text-primary"
                disabled={detecting}
                onClick={handleDetect}
              >
                {detecting ? (
                  <Loader2 className="mr-2 animate-spin" size={16} />
                ) : (
                  <Wifi className="mr-2" size={16} />
                )}
                Detect My Current IP
              </Button>

              {detectedIP && (
                <div className="rounded-xl border border-border bg-surface-2 p-4 text-sm">
                  <p className="text-text-muted">Your current public IP is:</p>
                  <p className="mt-1 font-mono text-lg text-text-primary">
                    {detectedIP}
                  </p>
                  <p className="mt-2 text-text-muted">
                    Is this your office network?
                  </p>
                  <div className="mt-3 flex gap-2">
                    <Button
                      className="flex-1 bg-primary text-background hover:bg-primary-dark"
                      onClick={handleConfirmDetected}
                    >
                      Yes, use this IP
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 border-border text-text-primary"
                      onClick={() => setMode("manual")}
                    >
                      Enter manually
                    </Button>
                  </div>
                </div>
              )}

              <button
                className="text-xs uppercase tracking-[2px] text-text-muted underline"
                onClick={() => setMode("manual")}
              >
                Skip detection — enter manually
              </button>
            </div>
          )}

          {mode === "manual" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[2px] text-text-muted">
                  Office public IP
                </label>
                <Input
                  placeholder="e.g. 103.123.45.67"
                  value={ipInput}
                  onChange={(e) => setIpInput(e.target.value)}
                />
                {ipInput && (
                  <p
                    className={`text-xs ${
                      isValidIP ? "text-success" : "text-danger"
                    }`}
                  >
                    {isValidIP ? "IP format looks good" : "Invalid IPv4 format"}
                  </p>
                )}
                <p className="text-xs text-warning">
                  Make sure you are connected to your office WiFi before
                  detecting. If your IP changes, come back and update it here.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[2px] text-text-muted">
                  Network label
                </label>
                <Input
                  placeholder="Main Office"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                />
                <p className="text-xs text-text-muted">
                  A name to identify this network.
                </p>
              </div>

              {/* Geofence configuration */}
              <div className="rounded-xl border border-border bg-surface-2 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="text-primary" size={16} />
                    <span className="font-heading text-sm uppercase tracking-widest text-primary">
                      Geofence (Optional)
                    </span>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={geofenceEnabled}
                    onClick={() => setGeofenceEnabled((v) => !v)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      geofenceEnabled ? "bg-primary" : "bg-border"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transition-transform duration-200 ease-in-out ${
                        geofenceEnabled ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                <p className="text-xs text-text-muted">
                  When enabled, the system captures employee GPS location at
                  punch time and calculates distance from the office. Currently
                  in <strong>observe mode</strong> — data is logged but
                  attendance is never blocked.
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs uppercase tracking-[2px] text-text-muted">
                      Latitude
                    </label>
                    <Input
                      placeholder="e.g. 12.971599"
                      value={latInput}
                      onChange={(e) => setLatInput(e.target.value)}
                      disabled={!geofenceEnabled}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs uppercase tracking-[2px] text-text-muted">
                      Longitude
                    </label>
                    <Input
                      placeholder="e.g. 77.594566"
                      value={lngInput}
                      onChange={(e) => setLngInput(e.target.value)}
                      disabled={!geofenceEnabled}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs uppercase tracking-[2px] text-text-muted">
                    Allowed radius (meters)
                  </label>
                  <Input
                    placeholder="200"
                    value={radiusInput}
                    onChange={(e) => setRadiusInput(e.target.value)}
                    disabled={!geofenceEnabled}
                  />
                  <p className="text-xs text-text-muted">
                    Recommended 200–300 m for indoor/multi-floor offices.
                  </p>
                </div>

                <p className="text-xs text-text-muted">
                  Tip: find your office coordinates on Google Maps — right-click
                  the building and copy the latitude and longitude.
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 border-border text-text-primary"
                  onClick={() => {
                    setMode("view");
                    setDetectedIP(null);
                    setIpInput("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-primary text-background hover:bg-primary-dark"
                  disabled={!isValidIP || !label.trim() || saving}
                  onClick={handleSave}
                >
                  {saving && (
                    <Loader2 className="mr-2 animate-spin" size={16} />
                  )}
                  Save Office IP
                </Button>
              </div>

              <div className="rounded-xl border border-warning/40 bg-warning/5 p-3 text-xs text-warning">
                If your internet provider changes your IP (usually rare for
                business connections), employees will not be able to punch in.
                Come back to this page and detect/update your IP if that
                happens.
              </div>
            </div>
          )}
        </div>
      )}

      <div className="rounded-xl border border-border bg-surface p-5">
        <h2 className="font-heading text-lg uppercase tracking-[3px] text-primary">
          How IP Verification Works
        </h2>
        <p className="mt-2 text-sm text-text-muted">
          All your office WiFi networks (main router, 5G, extender) share the
          same public IP address.
        </p>
        <p className="mt-2 text-sm text-text-muted">
          When an employee punches in, the server checks their IP matches your
          office IP. Works on all phones including iPhone.
        </p>
      </div>
    </div>
  );
}
