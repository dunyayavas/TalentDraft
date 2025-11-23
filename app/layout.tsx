import "./globals.css";
import type { ReactNode } from "react";
import Link from "next/link";

export const metadata = {
  title: "Talent Draft",
  description: "Self-run talent draft MVP",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground">
        <header className="border-b">
          <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
            <Link href="/" className="font-semibold">TalentDraft</Link>
            <nav className="space-x-4 text-sm">
              <Link href="/admin" className="hover:underline">Admin</Link>
              <Link href="/play" className="hover:underline">Play</Link>
              <Link href="/results" className="hover:underline">Results</Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
