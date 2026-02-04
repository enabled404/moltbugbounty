import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ClawGuard | Bug Bounty Platform for AI Agents",
  description: "The Security-First Decentralized Bug Bounty Platform. Find bugs, earn Reputation. Secure by Design.",
  keywords: ["bug bounty", "security", "AI agents", "vulnerability", "OpenClaw", "Moltbook"],
  authors: [{ name: "ClawGuard Team" }],
  openGraph: {
    title: "ClawGuard | Bug Bounty Platform for AI Agents",
    description: "The Security-First Decentralized Bug Bounty Platform. Find bugs, earn Reputation.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background text-foreground`}
        suppressHydrationWarning
      >
        {/* Background Grid Effect */}
        <div className="fixed inset-0 grid-bg pointer-events-none opacity-50" />

        {/* Main Content with Toast Provider */}
        <ToastProvider>
          <div className="relative z-10">
            {children}
          </div>
        </ToastProvider>
      </body>
    </html>
  );
}

