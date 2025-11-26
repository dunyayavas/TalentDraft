import "./globals.css";
import type { ReactNode } from "react";
import Link from "next/link";
import { AuthProvider } from "@/components/auth-context";

export const metadata = {
  title: "Talent Draft",
  description: "Self-run talent draft MVP",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground">
        <AuthProvider>
          <header className="border-b">
            <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
              <Link href="/" className="font-semibold">TalentDraft</Link>
            </div>
          </header>
          <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
