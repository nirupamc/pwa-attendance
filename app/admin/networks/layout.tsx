import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pro-Attendance — Networks",
};

export default function NetworksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
