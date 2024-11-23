import { redirect } from "next/navigation";
import SessionProvider from "./SessionProvider";
import LeftSidebar from "./LeftSidebar";
import { validateRequest } from "@/auth";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await validateRequest();

  // if user is not logged in, redirect to login page.
  if (!session.user) redirect("/login");

  // make sure all child component have access to the session cookie.
  return (
  <SessionProvider value={session}>
    <div className="">
      <LeftSidebar>{children}</LeftSidebar>
        
    </div>
  </SessionProvider>
  );
}
