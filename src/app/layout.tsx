import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ThemeProvider } from "@/app/ThemeProvider"
import { Toaster } from "@/components/ui/toaster";
import { OrganizationProvider } from './contexts/OrganizationContext'
import { SpeedInsights } from "@vercel/speed-insights/next"

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: {
    template: "%s | AutoSched",
    default: "AutoSched",
  },
  description: "Auto-Scheduling for travelling workers.",
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png' },
    ],
  },
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
        <OrganizationProvider>
          <ThemeProvider>
            {children}
            <SpeedInsights/>
          </ThemeProvider>
        </OrganizationProvider>
        <Toaster />
      </body>
    </html>
  );
}
