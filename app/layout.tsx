import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import ChatProvider from "./context/ChatProvider";
import "./globals.css";

// Read BACKEND_URL at request time (the Makefile/container sets it), and mount the
// chat store once for the whole app so navigation doesn't tear it down.
export const dynamic = "force-dynamic";

const inter = Inter({ subsets: ["latin"], display: "swap" });

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
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8000";
  return (
    <html className={inter.className}>
      <body>
        <ChatProvider backendUrl={backendUrl}>{children}</ChatProvider>
      </body>
    </html>
  );
}
