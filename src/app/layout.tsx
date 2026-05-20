import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "goey-toast/styles.css";
import "./globals.css";
import { AppToaster } from "@/components/ui/AppToaster";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "OpsPilot",
  description: "ServiceOps Command Center for service businesses.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full`}
      suppressHydrationWarning
    >
      <body suppressHydrationWarning>
        {children}
        <AppToaster />
      </body>
    </html>
  );
}
