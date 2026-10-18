import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tempa Co — Client Portal",
  description: "Portal klien Tempa Co untuk manajemen project dan komunikasi",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className="h-full antialiased dark">
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
