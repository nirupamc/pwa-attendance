import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TanTrack — Office Network",
};

export default function NetworksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

