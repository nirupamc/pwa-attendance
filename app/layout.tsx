import type { Metadata } from "next";
import { Bebas_Neue, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { InstallBanner } from "@/components/layout/InstallBanner";
import { Toaster } from "@/components/ui/sonner";

const bebasNeue = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-bebas",
});

const spaceGrotesk = Space_Grotesk({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-space",
});

export const metadata: Metadata = {
  title: "TanTrack",
  description: "Secure employee attendance management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`dark ${bebasNeue.variable} ${spaceGrotesk.variable} h-full antialiased`}
    >
      <head>
        <meta name="application-name" content="TanTrack" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <meta name="apple-mobile-web-app-title" content="TanTrack" />
        <meta name="theme-color" content="#FFD700" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="min-h-full bg-background text-text-primary font-body">
        {children}
        <InstallBanner />
        <Toaster />
      </body>
    </html>
  );
}

