import type { Metadata } from "next";
import { AuthProvider } from "@/lib/auth/context";
import { FormProvider } from "@/lib/forms/context";
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
      <body>
        <AuthProvider>
          <FormProvider>{children}</FormProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
