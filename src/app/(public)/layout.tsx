import { SiteHeader, SiteFooter } from "@/components/site-header";
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-6">{children}</main>
      <SiteFooter />
    </>
  );
}
