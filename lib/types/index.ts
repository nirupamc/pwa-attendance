export type EmployeeRole = "employee" | "admin";
export type DeviceStatus = "active" | "pending_rebind" | "revoked";

export interface Employee {
  id: string;
  full_name: string;
  email: string;
  employee_id: string;
  role: EmployeeRole;
  registered_device_id: string | null;
  device_token_hash: string | null;
  fingerprint_hash: string | null;
  fingerprint_profile: Record<string, unknown>;
  device_registered_at: string | null;
  last_device_seen_at: string | null;
  last_office_ip: string | null;
  device_status: DeviceStatus;
  device_name: string | null;
  device_browser: string | null;
  device_platform: string | null;
  device_user_agent: string | null;
  device_rotated_at: string | null;
  must_change_password: boolean;
  avatar_url: string | null;
  created_at: string;
}

export interface OfficeNetwork {
  id: string;
  label: string;
  ssid_name: string;
  bssid: string;
  added_by: string | null;
  created_at: string;
}

export interface OfficeConfig {
  id: string;
  label: string;
  public_ip: string;
  added_by: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  office_latitude: number | null;
  office_longitude: number | null;
  allowed_radius_meters: number;
  geofence_enabled: boolean;
}

export type AttendanceType = "IN" | "OUT";

export interface Attendance {
  id: string;
  user_id: string;
  type: AttendanceType;
  punched_at: string;
  bssid_at_scan: string | null;
  network_label: string | null;
  ip_at_punch: string | null;
  qr_verified: boolean;
  punch_latitude: number | null;
  punch_longitude: number | null;
  location_accuracy: number | null;
  geofence_distance_meters: number | null;
  geofence_passed: boolean | null;
  location_captured_at: string | null;
  geofence_validation_mode: string | null;
  geofence_reason: string | null;
}

export interface OfficeQrCode {
  id: string;
  secret_token: string;
  is_active: boolean;
  generated_by: string | null;
  created_at: string;
}

export type LeaveType = "Sick" | "Casual" | "Paid";
export type LeaveStatus = "Pending" | "Approved" | "Rejected";

export interface LeaveRequest {
  id: string;
  user_id: string;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  reason: string | null;
  rejection_reason: string | null;
  status: LeaveStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface PushSubscriptionRow {
  id: string;
  user_id: string;
  subscription: Record<string, unknown>;
  created_at: string;
}

export interface DeviceSecurityEvent {
  id: string;
  user_id: string | null;
  event_type: string;
  message: string;
  ip_address: string | null;
  user_agent: string | null;
  details: Record<string, unknown>;
  created_at: string;
}
