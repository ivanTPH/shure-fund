import type { Metadata, Viewport } from "next";
import "./globals.css";
import PwaBootstrap from "./components/PwaBootstrap";

export const metadata: Metadata = {
  title: "Shure.Fund",
  description: "Construction finance platform — Shure.Fund",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Shure.Fund",
  },
};

export const viewport: Viewport = {
  themeColor: "#0D1144",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="h-full min-h-full">
        <PwaBootstrap />
        {children}
      </body>
    </html>
  );
}
