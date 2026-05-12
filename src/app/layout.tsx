import type { Metadata } from "next";
import { Poppins, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { BusyOverlayProvider } from "@/components/ui/busy-overlay-provider";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { AuthWatcher } from "@/components/auth/auth-watcher";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "AsistenQu",
  description: "Ruang kerja digital untuk membantu koordinasi asuransi, klaim, dan layanan kesehatan secara lebih tertata.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${poppins.variable} ${instrumentSerif.variable} antialiased bg-background text-foreground`}
        style={{ fontFamily: 'var(--font-poppins), sans-serif' }}
      >
        <BusyOverlayProvider>
          <AuthWatcher />
          {children}
        </BusyOverlayProvider>
        <Toaster />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
