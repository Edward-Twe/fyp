import { redirect } from "next/navigation";
import SessionProvider from "./SessionProvider";
import LeftSidebar from "./LeftSidebar";
import { validateRequest } from "@/auth";
import { GoogleMapsProvider } from "../../components/GoogleMapsProvider";

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
      <LeftSidebar className="max-h-">
        <GoogleMapsProvider>
          {children}
        </GoogleMapsProvider>
      </LeftSidebar>
  </SessionProvider>
  );
}
