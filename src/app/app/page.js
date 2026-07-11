import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import MainApp from "@/components/MainApp";

export default async function AppPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = await verifyToken(token);
  if (!session) redirect("/login");
  return <MainApp userName={session.name} />;
}
