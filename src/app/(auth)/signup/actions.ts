"use server"

import { lucia } from "@/auth";
import prisma from "@/lib/prisma";
import { signUpSchema, SignUpValues } from "@/lib/validation";
import { hash } from "@node-rs/argon2"
import { generateIdFromEntropySize } from "lucia";
import { isRedirectError } from "next/dist/client/components/redirect";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function signUp(
    credentials: SignUpValues
): Promise<{error: string}> {
    try {
        // check if the credentials are valid or strong enough.
        const { username, email, password } = signUpSchema.parse(credentials);

        // hash the password if credentials are valid to the schema.
        const passwordHash = await hash(password, {
            // this configuration is taken from lucia auth documentation.
            memoryCost: 19456,
            timeCost: 2, 
            outputLen: 32, 
            parallelism: 1
        })

        // generate random id
        const userId = generateIdFromEntropySize(10);

        // check if username already exists
        const usernameExisted = await prisma.user.findFirst({
            where: {
                username: {
                    equals: username, 
                    mode: "insensitive", // ignore uppercase and lowercase 
                }
            }
        })

        if (usernameExisted) {
            return {
                error: "Username already exists."
            }
        }

        //check if email already exists
        const emailExisted = await prisma.user.findFirst({
            where: {
                email: {
                    equals: email, 
                    mode: "insensitive",
                }
            }
        })

        if (emailExisted) {
            return {
                error: "Email already exists."
            }
        }

        // create user if everything is okay.
        await prisma.user.create({
            data: {
                id: userId, 
                username, 
                displayName: username,
                email, 
                passwordHash
            }
        })

        //create a session so user is immediately logged in.
        const session = await lucia.createSession(userId, {});
        const sessionCookie = lucia.createSessionCookie(session.id);
        const cookieStore = await cookies()
        cookieStore.set(
            sessionCookie.name, 
            sessionCookie.value, 
            sessionCookie.attributes,
        )

        return redirect("/");

    } catch (error) {
        // redirecting will throw an error..
        if (isRedirectError(error)) throw error;
        console.error(error);
        return {
            error: "Something went wrong, Please try again."
        }
    }
}