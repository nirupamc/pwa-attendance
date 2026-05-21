import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pro-Attendance — QR Code",
};

export default function QrLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
