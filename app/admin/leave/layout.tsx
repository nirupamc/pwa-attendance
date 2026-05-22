import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TanTrack — Leave Inbox",
};

export default function AdminLeaveLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

