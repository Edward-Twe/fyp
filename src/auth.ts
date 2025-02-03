import { PrismaAdapter } from "@lucia-auth/adapter-prisma"
import prisma from "./lib/prisma"
import { Lucia, Session, User } from "lucia"
import { cache } from "react";
import { cookies } from "next/headers";
import { Cookie } from "lucia";

// to connect to database
const adapter = new PrismaAdapter(prisma.session, prisma.user);

export const lucia = new Lucia(adapter, {
    sessionCookie: {
        // the cookie nvr expires until browser is closed
        expires: false, 
        attributes: {
            // only allow cookies to be transmitted over https during production, more secure
            secure: process.env.NODE_ENV === "production"
        }
    },
    // when lucia return session, these information is also returned
    getUserAttributes(databaseUserAttributes) {
        return {
            id: databaseUserAttributes.id,
            username: databaseUserAttributes.username,
            displayName: databaseUserAttributes.displayName,
            profilePic: databaseUserAttributes.profilePic,
            googleId: databaseUserAttributes.googleId,
            email: databaseUserAttributes.email,
        };
    },
});

declare module "lucia" {
    // connect the lucia databaseuser attributes to the interface.
    // to allow lucia to fetch other information of user from database
    interface Register {
        Lucia: typeof lucia;
        DatabaseUserAttributes: DatabaseUserAttributes;
    }
}

interface DatabaseUserAttributes {
    id: string;
    username: string;
    displayName: string;
    profilePic: string|null;
    googleId: string|null;
    email: string|null;
}

// to validate and store the validated result. so no multiple validation request is required for multiple actions.
export const validateRequest = cache(
    async(): Promise<
        { user: User; session: Session; cookies?: Cookie } | 
        { user: null; session: null; cookies?: Cookie }
    > => {
        const cookieStore = await cookies()
        const sessionId = cookieStore.get(lucia.sessionCookieName)?.value ?? null;

        if (!sessionId) {
            return {
                user: null, 
                session: null,
                cookies: undefined
            }
        }

        const result = await lucia.validateSession(sessionId);

        // Only set cookies in server actions/route handlers
        if (result.session?.fresh || !result.session) {
            return {
                ...result,
                cookies: result.session 
                    ? lucia.createSessionCookie(result.session.id)
                    : lucia.createBlankSessionCookie()
            }
        }

        return result
    }
);