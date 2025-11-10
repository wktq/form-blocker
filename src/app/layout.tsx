import type { Metadata } from "next";
import { AuthProvider } from "@/lib/auth/context";
import { FormProvider } from "@/lib/forms/context";
import "./globals.css";

export const metadata: Metadata = {
  title: "FormBlocker - スパム・営業目的送信をブロック",
  description:
    "FormBlocker は営業目的・スパム送信をリアルタイムで検知して遮断するフォーム防御プラットフォームです。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased">
        <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
          <div className="pointer-events-none fixed inset-0">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.22),_transparent_55%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,_rgba(16,185,129,0.18),_transparent_45%)]" />
            <div
              className="absolute inset-0 opacity-30 mix-blend-screen"
              style={{
                backgroundImage:
                  "linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(180deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
                backgroundSize: "120px 120px",
              }}
            />
          </div>
          <div className="relative z-10 flex min-h-screen flex-col">
            <AuthProvider>
              <FormProvider>{children}</FormProvider>
            </AuthProvider>
          </div>
        </div>
      </body>
    </html>
  );
}
