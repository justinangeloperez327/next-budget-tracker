import type { Metadata } from "next";
import "./globals.css";
import { characterThemeScript } from "@/lib/character-theme";
import { AppearanceProvider } from "@/components/theme-controls";
export const metadata: Metadata = {
  title: { default: "Budget Tracker", template: "%s | Budget Tracker" },
  description: "A calmer way to track spending and plan your monthly budget.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-character="sakura" suppressHydrationWarning>
      <body className="antialiased">
        <script dangerouslySetInnerHTML={{ __html: characterThemeScript }} />
        <AppearanceProvider>{children}</AppearanceProvider>
      </body>
    </html>
  );
}
