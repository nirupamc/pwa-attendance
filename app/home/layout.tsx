import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pro-Attendance — Home",
};

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
