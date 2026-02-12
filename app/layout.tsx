import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ConditionalLayout } from "@/components/layout/ConditionalLayout";
import { WebVitalsReporter } from "@/components/WebVitalsReporter";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "GYANA SPARDHA - Odisha Quiz Competition",
  description: "Participate in the GYANA SPARDHA quiz competition and test your knowledge about Odisha's culture, traditions, history, and geography.",
  icons: {
    icon: '/images/logo.webp',
    apple: '/images/logo.webp',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <WebVitalsReporter />
        <ConditionalLayout>
          {children}
        </ConditionalLayout>
      </body>
    </html>
  );
}
