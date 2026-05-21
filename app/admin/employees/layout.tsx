import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pro-Attendance — Employees",
};

export default function EmployeesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
