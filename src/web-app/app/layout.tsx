import type { Metadata } from "next";
import "./globals.css";
import ShureFundAppShell from "./components/ShureFundAppShell";

export const metadata: Metadata = {
  title: "Shure.Fund",
  description: "Rules-based construction funding control dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="h-full min-h-full">
        <ShureFundAppShell>{children}</ShureFundAppShell>
      </body>
    </html>
  );
}
