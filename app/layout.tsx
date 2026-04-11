// app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { AuthProvider } from "./components/AuthContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Web3 Escrow Pay",
  description: "Sistema de pagamento em escrow na blockchain Polygon",
};

import Sidebar from "./components/Sidebar";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${geistSans.variable} ${geistMono.variable} dark`}>
      <body className="min-h-screen bg-slate-950 flex">
        <AuthProvider>
          <Providers>
            <Sidebar />
            <main className="flex-1 h-screen overflow-y-auto overflow-x-hidden">
              {children}
            </main>
          </Providers>
        </AuthProvider>
      </body>
    </html>
  );
}