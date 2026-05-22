"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useState } from "react";
import {
  Circle,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Attendance, Employee, OfficeConfig } from "@/lib/types";
import { formatTime } from "@/lib/utils/time";

// ── Marker helpers ──────────────────────────────────────────────────────────

type EmployeeStatus = "inside" | "outside" | "weak_gps" | "unknown";

const STATUS_COLORS: Record<EmployeeStatus, string> = {
  inside: "#4CAF50",
  outside: "#FF5252",
  weak_gps: "#FF8A4C",
  unknown: "#FFD700",
};

const STATUS_LABELS: Record<EmployeeStatus, string> = {
  inside: "Inside Geofence",
  outside: "Outside Geofence",
  weak_gps: "Weak GPS",
  unknown: "No Geofence Data",
};

function getStatus(row: Attendance): EmployeeStatus {
  if (row.location_accuracy != null && row.location_accuracy > 50) {
    return "weak_gps";
  }
  if (row.geofence_passed === true) return "inside";
  if (row.geofence_passed === false) return "outside";
  return "unknown";
}

function makeEmployeeIcon(status: EmployeeStatus) {
  const color = STATUS_COLORS[status];
  return L.divIcon({
    html: `<div style="
      width:18px;height:18px;
      border-radius:50%;
      background:${color};
      border:2.5px solid #0A0A0A;
      box-shadow:0 0 0 3px ${color}40,0 2px 6px rgba(0,0,0,0.6);
    "></div>`,
    className: "",
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -14],
  });
}

function makeOfficeIcon() {
  return L.divIcon({
    html: `<div style="
      width:28px;height:28px;
      border-radius:50%;
      background:#FFD700;
      border:2.5px solid #0A0A0A;
      box-shadow:0 0 0 4px rgba(255,215,0,0.25),0 2px 10px rgba(0,0,0,0.7);
      display:flex;align-items:center;justify-content:center;
    "><svg viewBox="0 0 14 14" width="14" height="14" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="6" width="10" height="7" rx="0.5" fill="#0A0A0A"/>
      <path d="M0 6L7 1l7 5H0z" fill="#0A0A0A"/>
      <rect x="4.5" y="8" width="2" height="3" fill="#FFD700"/>
      <rect x="7.5" y="8" width="2" height="3" fill="#FFD700"/>
    </svg></div>`,
    className: "",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -18],
  });
}

// ── Auto-fit bounds ─────────────────────────────────────────────────────────

function AutoFitBounds({
  office,
  employees,
}: {
  office: OfficeConfig | null;
  employees: Attendance[];
}) {
  const map = useMap();

  useEffect(() => {
    const points: [number, number][] = [];
    if (office?.office_latitude && office?.office_longitude) {
      points.push([office.office_latitude, office.office_longitude]);
    }
    employees.forEach((row) => {
      if (row.punch_latitude && row.punch_longitude) {
        points.push([row.punch_latitude, row.punch_longitude]);
      }
    });

    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 17);
      return;
    }
    map.fitBounds(L.latLngBounds(points), { padding: [60, 60] });
  }, [office, employees, map]);

  return null;
}

// ── Legend overlay ──────────────────────────────────────────────────────────

function Legend() {
  const entries: [EmployeeStatus, string][] = [
    ["inside", "Inside geofence"],
    ["outside", "Outside geofence"],
    ["weak_gps", "Weak GPS (>50m)"],
    ["unknown", "No geofence data"],
  ];

  return (
    <div
      className="absolute bottom-8 left-3 z-[1000] rounded-lg border border-border bg-surface/90 px-3 py-2 backdrop-blur-sm"
      style={{ pointerEvents: "none" }}
    >
      {entries.map(([status, label]) => (
        <div key={status} className="flex items-center gap-2 py-0.5">
          <span
            className="block h-3 w-3 flex-shrink-0 rounded-full"
            style={{ background: STATUS_COLORS[status] }}
          />
          <span className="text-xs text-text-muted">{label}</span>
        </div>
      ))}
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

interface PresenceMapProps {
  presentEmployees: Attendance[];
  employeeMap: Record<string, Employee>;
}

export function PresenceMap({ presentEmployees, employeeMap }: PresenceMapProps) {
  const [officeConfig, setOfficeConfig] = useState<OfficeConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase
      .from("office_config")
      .select("*")
      .eq("is_active", true)
      .single()
      .then(({ data }) => {
        setOfficeConfig((data as OfficeConfig) ?? null);
        setConfigLoading(false);
      });
  }, []);

  const employeesWithCoords = useMemo(
    () => presentEmployees.filter((r) => r.punch_latitude && r.punch_longitude),
    [presentEmployees]
  );

  const hasOffice =
    officeConfig?.office_latitude != null &&
    officeConfig?.office_longitude != null;

  const defaultCenter: [number, number] = hasOffice
    ? [officeConfig!.office_latitude!, officeConfig!.office_longitude!]
    : [3.139, 101.6869];

  if (configLoading) {
    return (
      <div className="flex h-80 animate-pulse items-center justify-center rounded-lg border border-border bg-surface-2">
        <span className="text-sm text-text-muted">Loading map…</span>
      </div>
    );
  }

  if (!hasOffice && employeesWithCoords.length === 0) {
    return (
      <div className="flex h-80 items-center justify-center rounded-lg border border-border bg-surface-2">
        <p className="max-w-xs text-center text-sm text-text-muted">
          No location data available. Configure office coordinates in{" "}
          <span className="text-primary">Network Settings</span> to enable the
          Presence Map.
        </p>
      </div>
    );
  }

  return (
    <div
      className="relative overflow-hidden rounded-lg border border-border"
      style={{ height: 420 }}
    >
      <MapContainer
        center={defaultCenter}
        zoom={16}
        style={{ height: "100%", width: "100%", background: "#1A1A1A" }}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/" target="_blank">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          maxZoom={19}
        />

        <AutoFitBounds office={officeConfig} employees={employeesWithCoords} />

        {/* Geofence radius circle */}
        {hasOffice && officeConfig!.geofence_enabled && (
          <Circle
            center={[officeConfig!.office_latitude!, officeConfig!.office_longitude!]}
            radius={officeConfig!.allowed_radius_meters ?? 100}
            pathOptions={{
              color: "#FFD700",
              fillColor: "#FFD700",
              fillOpacity: 0.06,
              weight: 1.5,
              dashArray: "6 4",
            }}
          />
        )}

        {/* Office marker */}
        {hasOffice && (
          <Marker
            position={[officeConfig!.office_latitude!, officeConfig!.office_longitude!]}
            icon={makeOfficeIcon()}
          >
            <Popup className="presence-popup">
              <div className="min-w-[140px] space-y-1">
                <p className="font-semibold text-sm">{officeConfig!.label ?? "Office"}</p>
                {officeConfig!.geofence_enabled && (
                  <p className="text-xs opacity-60">
                    Geofence: {officeConfig!.allowed_radius_meters ?? "—"}m radius
                  </p>
                )}
              </div>
            </Popup>
          </Marker>
        )}

        {/* Employee dots */}
        {employeesWithCoords.map((row) => {
          const employee = employeeMap[row.user_id];
          const status = getStatus(row);
          const color = STATUS_COLORS[status];
          return (
            <Marker
              key={row.id}
              position={[row.punch_latitude!, row.punch_longitude!]}
              icon={makeEmployeeIcon(status)}
            >
              <Popup className="presence-popup">
                <div className="min-w-[170px] space-y-1.5">
                  <div>
                    <p className="font-semibold text-sm">
                      {employee?.full_name ?? "Unknown"}
                    </p>
                    <p className="text-xs opacity-50">
                      {employee?.employee_id ?? "—"}
                    </p>
                  </div>
                  <div className="border-t opacity-20" />
                  <p className="text-xs opacity-70">
                    IN:{" "}
                    <span className="opacity-100 font-medium">
                      {formatTime(new Date(row.punched_at))}
                    </span>
                  </p>
                  {row.geofence_distance_meters != null && (
                    <p className="text-xs opacity-70">
                      Distance:{" "}
                      <span className="opacity-100 font-medium">
                        {Math.round(row.geofence_distance_meters)}m
                      </span>
                    </p>
                  )}
                  {row.location_accuracy != null && (
                    <p className="text-xs opacity-70">
                      GPS accuracy:{" "}
                      <span className="opacity-100 font-medium">
                        ±{Math.round(row.location_accuracy)}m
                      </span>
                    </p>
                  )}
                  <div
                    className="mt-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
                    style={{ background: `${color}22`, color }}
                  >
                    <span
                      className="inline-block h-1.5 w-1.5 rounded-full flex-shrink-0"
                      style={{ background: color }}
                    />
                    {STATUS_LABELS[status]}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      <Legend />
    </div>
  );
}
