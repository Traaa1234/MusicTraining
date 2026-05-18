import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AudioProvider } from "@/components/audio/audio-provider";
import { AppShell } from "@/components/layout/app-shell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ),
  title: {
    default: "Ear Train — Learn music theory and play by ear",
    template: "%s · Ear Train",
  },
  description:
    "Interactive music-theory lessons, ear training, and spaced repetition — learn to play by ear, right in your browser.",
  openGraph: {
    title: "Ear Train — Learn music theory and play by ear",
    description:
      "Interactive lessons, ear training, and spaced repetition for musicians.",
    type: "website",
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <AudioProvider>
          <AppShell>{children}</AppShell>
        </AudioProvider>
      </body>
    </html>
  );
}
