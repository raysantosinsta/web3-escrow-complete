// app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { AuthProvider } from "./components/AuthContext";
import Header from "./components/Header";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PayWeb3 - Gateway & Escrow",
  description: "Sistema de pagamento e escrow na blockchain Polygon",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${geistSans.variable} ${geistMono.variable} dark`}>
      <body className="min-h-screen bg-slate-950 flex flex-col">
        <AuthProvider>
          <Providers>
            <Header />
            <main className="flex-1 w-full overflow-y-auto">
              {children}
            </main>
          </Providers>
        </AuthProvider>
      </body>
    </html>
  );
}