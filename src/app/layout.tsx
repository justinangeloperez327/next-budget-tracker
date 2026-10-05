import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: { default: "Budget Tracker", template: "%s | Budget Tracker" },
  description: "A calmer way to track spending and plan your monthly budget.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
