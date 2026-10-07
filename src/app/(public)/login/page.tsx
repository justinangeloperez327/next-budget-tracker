import { AuthForm } from "@/components/auth-form";
export default function Page() {
  return <AuthForm configured={Boolean(process.env.DATABASE_URL)} />;
}
