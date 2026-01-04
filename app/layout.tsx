import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { MapProvider } from "@/contexts/MapContext";
import { NavigationProvider } from "@/contexts/NavigationContext";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import ConsoleFilter from "@/components/ConsoleFilter";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Map Tracking - Location Tracker & Navigation",
  description: "Track your location, record trips, and navigate with Mapbox",
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
        suppressHydrationWarning
      >
        <ConsoleFilter />
        <ServiceWorkerRegistration />
        <MapProvider>
          <NavigationProvider>
            {children}
          </NavigationProvider>
        </MapProvider>
      </body>
    </html>
  );
}
