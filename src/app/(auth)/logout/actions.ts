"use server"

import { lucia, validateRequest } from "@/auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function logout() {
    const {session} = await validateRequest();

    if (!session) {
        throw new Error("Unauthorized");
    }

    await lucia.invalidateSession(session.id);

    const blankSessionCookie = lucia.createBlankSessionCookie();

    //set the cookie to blank
    const cookieStore = await cookies()
    cookieStore.set(
        blankSessionCookie.name, 
        blankSessionCookie.value, 
        blankSessionCookie.attributes
    )

    return redirect("/login");
}