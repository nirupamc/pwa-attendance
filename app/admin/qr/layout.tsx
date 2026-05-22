import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TanTrack — QR Code",
};

export default function QrLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

