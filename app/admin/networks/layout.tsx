import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pro-Attendance — Office Network",
};

export default function NetworksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
