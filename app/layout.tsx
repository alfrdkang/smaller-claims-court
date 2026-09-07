import type { Metadata } from "next";
import { Cinzel, Great_Vibes, IBM_Plex_Mono, Lora } from "next/font/google";
import Link from "next/link";
import React from "react";

import { COURT_NAME } from "@/lib/site";

import "./globals.css";

const display = Cinzel({ subsets: ["latin"], weight: ["400", "600", "700"], variable: "--font-display" });
const serif = Lora({ subsets: ["latin"], variable: "--font-serif" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono" });
const script = Great_Vibes({ subsets: ["latin"], weight: "400", variable: "--font-script" });

export const metadata: Metadata = {
  title: "The Smaller Claims Court",
  description:
    "File suit against your friends over things that do not matter. A judge will hear you out, at length, in a stern voice.",
  openGraph: {
    title: "The Smaller Claims Court",
    description: "Petty disputes, heard with the full weight of fabricated federal case law.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${serif.variable} ${mono.variable} ${script.variable}`}
    >
      <body className="min-h-screen">
        <header className="border-b border-brass-600/20">
          <nav className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-4">
            <Link href="/" className="group flex items-center gap-3">
              <span className="text-2xl transition group-hover:rotate-12" aria-hidden>
                &#9878;&#65039;
              </span>
              <span className="leading-tight">
                <span className="block font-display text-xs uppercase tracking-[0.18em] text-brass-200 sm:text-sm sm:tracking-[0.22em]">
                  Smaller Claims Court
                </span>
                <span className="hidden font-mono text-[10px] uppercase tracking-[0.24em] text-oak-300/70 sm:block">
                  {COURT_NAME}
                </span>
              </span>
            </Link>
            <div className="flex shrink-0 items-center gap-4 font-mono text-[11px] uppercase tracking-[0.2em] sm:gap-5">
              <Link
                href="/docket"
                className="whitespace-nowrap text-oak-200 transition hover:text-brass-300"
              >
                Docket
              </Link>
              <Link
                href="/file"
                className="whitespace-nowrap rounded-sm border border-brass-500/50 px-3 py-1.5 text-brass-200 transition hover:border-brass-300 hover:text-brass-100"
              >
                File a case
              </Link>
            </div>
          </nav>
        </header>

        <main className="mx-auto max-w-5xl px-5 py-10">{children}</main>

        <footer className="mx-auto max-w-5xl px-5 pb-12 pt-4">
          <div className="rule-brass mb-4" />
          <p className="text-center font-mono text-[10px] uppercase tracking-[0.22em] text-oak-400/60">
            All rulings are final and non-appealable, unless you ask really nicely.
          </p>
        </footer>
      </body>
    </html>
  );
}
