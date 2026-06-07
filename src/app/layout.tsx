import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { TooltipProvider } from "@client/components/ui/tooltip";
import { Toaster } from "@client/components/ui/sonner";
import { Providers } from "@client/components/providers/providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Talent Intelligence Platform",
  description:
    "Talent Intelligence & Communication Verification Platform — Structure, filter, and assess candidates with AI-powered tools.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <TooltipProvider>
          <Providers>
            {children}
          </Providers>
          <Toaster />
        </TooltipProvider>
      </body>
    </html>
  );
}
