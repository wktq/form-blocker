import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Form Blocker - スパム・営業目的送信をブロック",
  description: "Webフォームへの営業目的・スパム送信を自動でブロックします",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
