import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Shure.Fund",
  description: "Construction finance platform — Shure.Fund",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="h-full min-h-full">
        {children}
      </body>
    </html>
  );
}
