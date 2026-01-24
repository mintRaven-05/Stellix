import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import BottomNav from "@/components/BottomNav";
import ProtectedPayNotifications from "@/components/ProtectedPayNotifications";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "sUPI - Stellar UPI Platform",
  description: "Mobile-first Stellar based UPI platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AuthProvider>
          {/* max-w-md keeps it phone-first even on desktop */}
          <div className="min-h-screen bg-[#f5f5f5]">
            <div className="mx-auto max-w-md min-h-screen pb-[92px]">
              {children}
            </div>
            <BottomNav />
          </div>
          <ProtectedPayNotifications />
        </AuthProvider>
      </body>
    </html>
  );
}
