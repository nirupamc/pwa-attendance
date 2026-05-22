import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TanTrack — Home",
};

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

