import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "AsistenQu",
  description: "Ruang kerja multi-dashboard untuk operasional dan analitik.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${poppins.variable} antialiased bg-background text-foreground`}
        style={{ fontFamily: 'var(--font-poppins), sans-serif' }}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
