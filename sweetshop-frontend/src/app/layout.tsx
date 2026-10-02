import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ChatBot from "@/components/ChatBot";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "KING CAKE PLACE",
  description: "Cakes, sweets, biscuits and bakery items — order online.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${manrope.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-cream text-charcoal">
        <AuthProvider>
          <CartProvider>
            <Navbar />
            <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
            <Footer />
            <ChatBot />
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
