import type { Metadata } from "next";
import { Geist, Geist_Mono, Noto_Sans_JP, Noto_Sans_KR, Noto_Sans_SC } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// CJK album titles and notes: Google's sliced CJK fonts (self-hosted by next/font), so a browser only fetches
// the slices for characters actually on screen. Not preloaded: Latin-only rooms download nothing.
// (next/font needs literal options, so they're repeated.)
const notoSC = Noto_Sans_SC({ weight: ["400", "700"], preload: false, display: "swap", variable: "--font-cjk-sc" });
const notoJP = Noto_Sans_JP({ weight: ["400", "700"], preload: false, display: "swap", variable: "--font-cjk-jp" });
const notoKR = Noto_Sans_KR({ weight: ["400", "700"], preload: false, display: "swap", variable: "--font-cjk-kr" });

export const metadata: Metadata = {
  title: "My Room",
  description: "A neon bedroom for your vinyl collection.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${notoSC.variable} ${notoJP.variable} ${notoKR.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
