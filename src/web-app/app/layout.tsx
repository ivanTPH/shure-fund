import type { Metadata } from "next";
import "./globals.css";
import MobileAppStateProvider from "./components/MobileAppState";
import PrototypeProvider from "./components/PrototypeProvider";
import RuntimeRenderBoundary from "./components/RuntimeRenderBoundary";

export const metadata: Metadata = {
  title: "Shure.Fund",
  description: "Mobile-first contract workflow prototype for Shure.Fund",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="h-full min-h-full">
        <RuntimeRenderBoundary>
          <MobileAppStateProvider>
            <PrototypeProvider>{children}</PrototypeProvider>
          </MobileAppStateProvider>
        </RuntimeRenderBoundary>
      </body>
    </html>
  );
}
