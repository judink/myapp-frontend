import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider"; // AuthProvider 임포트
import NavigationBar from "@/components/layout/NavigationBar"; // NavigationBar 임포트

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DLMM WebApp", // 앱 제목 변경
  description: "Meteora DLMM Liquidity Management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-text-primary`}>
        <AuthProvider>
          <NavigationBar />
          <main className="pt-12"> {/* Adjusted padding-top to offset fixed navbar height (h-12 = 3rem = 48px) */}
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
