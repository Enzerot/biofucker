import { Inter } from "next/font/google";
import "./globals.css";
import type { Metadata } from "next";
import ClientLayout from "./components/ClientLayout";

const inter = Inter({ subsets: ["latin", "cyrillic"] });

export const metadata: Metadata = {
  title: "Биофакер",
  description: "Отслеживайте свои добавки и их эффективность",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body className={inter.className}>
        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  );
}
