import type { Metadata, Viewport } from "next";
import { Cinzel, Cormorant_Garamond, Inter } from "next/font/google";
import { MotionProvider } from "@/components/motion";
import { Ripple } from "@/components/Ripple";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
// Classical Roman capitals for engraved plaques, banners and headings.
const cinzel = Cinzel({ variable: "--font-cinzel", subsets: ["latin"], weight: ["500", "600", "700", "800", "900"] });
const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Hall of Fantasy",
  description: "Turn your ESPN fantasy basketball league history into a Hall of Fame.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0d0c0a",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${cinzel.variable} ${cormorant.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <Ripple />
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
