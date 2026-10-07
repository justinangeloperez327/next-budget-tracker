import type { Metadata } from "next";
import "./globals.css";
import { AppearanceProvider } from "@/components/theme-controls";
export const metadata: Metadata = {
  title: { default: "Budget Tracker", template: "%s | Budget Tracker" },
  description: "A calmer way to track spending and plan your monthly budget.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <AppearanceProvider>{children}</AppearanceProvider>
      </body>
    </html>
  );
}
