import Link from "next/link";
export default function NotFound() {
  return (
    <main className="mx-auto max-w-xl p-10">
      <h1 className="text-2xl font-medium">Page not found</h1>
      <Link className="mt-6 inline-block underline" href="/">
        Back to homepage
      </Link>
    </main>
  );
}
