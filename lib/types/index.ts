export type EmployeeRole = "employee" | "admin";

export interface Employee {
  id: string;
  full_name: string;
  email: string;
  employee_id: string;
  role: EmployeeRole;
  registered_device_id: string | null;
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

export type AttendanceType = "IN" | "OUT";

export interface Attendance {
  id: string;
  user_id: string;
  type: AttendanceType;
  punched_at: string;
  bssid_at_scan: string | null;
  network_label: string | null;
  qr_verified: boolean;
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
