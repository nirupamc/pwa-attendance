import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TanTrack — Leave",
};

export default function LeaveLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

