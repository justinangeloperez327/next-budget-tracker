import { SiteHeader, SiteFooter } from "@/components/site-header";
import { currentUser } from "@/lib/server/session";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();
  const account = user ? { name: user.name, email: user.email } : null;

  return (
    <>
      <SiteHeader account={account} />
      <main className="mx-auto max-w-6xl px-6">{children}</main>
      <SiteFooter authenticated={Boolean(account)} />
    </>
  );
}
