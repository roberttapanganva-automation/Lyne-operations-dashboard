import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "goey-toast/styles.css";
import "./globals.css";
import { AppToaster } from "@/components/ui/AppToaster";
import { DEFAULT_BRAND } from "@/lib/branding/defaults";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: DEFAULT_BRAND.appName,
  description: `${DEFAULT_BRAND.subtitle} for service businesses.`,
  icons: {
    apple: DEFAULT_BRAND.iconUrl,
    icon: DEFAULT_BRAND.iconUrl,
    shortcut: DEFAULT_BRAND.iconUrl,
  },
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
