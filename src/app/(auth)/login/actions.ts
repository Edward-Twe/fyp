"use server"

import prisma from "@/lib/prisma";
import { loginSchema, LoginValues } from "@/lib/validation";
import { isRedirectError } from "next/dist/client/components/redirect";
import { verify } from "@node-rs/argon2"
import { lucia } from "@/auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function login(
    credentials: LoginValues
): Promise<{error: string}> {
    try {
        const {username, password} = loginSchema.parse(credentials)

        const userExisted = await prisma.user.findFirst({
                where: {
                username: {
                    equals: username, 
                    mode: "insensitive"
                }
            }
        });

        // if user doesnt exist or user exist but no password due to sign in using google account)
        if (!userExisted || !userExisted.passwordHash) {
            return {
                error: "Username or password is incorrect."
            }
        }

        const correctPassword = await verify(userExisted.passwordHash, password, {
            // this configuration is taken from lucia auth documentation.
            memoryCost: 19456,
            timeCost: 2, 
            outputLen: 32, 
            parallelism: 1
        })

        if (!correctPassword) {
            return {
                error: "Username or password is incorrect."
            }
        }

        const session = await lucia.createSession(userExisted.id, {});
        const sessionCookie = lucia.createSessionCookie(session.id);
        const cookieStore = await cookies()
        cookieStore.set(
            sessionCookie.name, 
            sessionCookie.value, 
            sessionCookie.attributes
        );

        return redirect("/")
    } catch (error) {
        if (isRedirectError(error)) throw error;
        console.error(error);
        return {
            error: "Something went wrong. Please try again.",
        };
    }
}