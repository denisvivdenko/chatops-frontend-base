import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Providers } from './providers';
import AppShell from "@/app/components/layout/AppShell/AppShell";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const dynamic = "force-dynamic";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "ChatOps",
  description: "Chat assistant",
};

export default function RootLayout({
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html className={inter.className}>
      <body>
        <Providers>
          <AppShell />
        </Providers>
      </body>
    </html>
  );
}
