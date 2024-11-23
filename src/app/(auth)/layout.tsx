"use server"

import { validateRequest } from "@/auth";
import { redirect } from "next/navigation";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await validateRequest();

  // if user already have a session/is logged in, redirect them immediately.
  if (user) redirect("/");

  return <>{children}</>;
}
