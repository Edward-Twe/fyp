import { PrismaAdapter } from "@lucia-auth/adapter-prisma"
import prisma from "./lib/prisma"
import { Lucia, Session, User } from "lucia"
import { cache } from "react";
import { cookies } from "next/headers";

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
        { user: User, session: Session } | { user: null, session: null } 
    > => {
            // check if there is a session ID
            const cookieStore = await cookies()
            const sessionId = cookieStore.get(lucia.sessionCookieName)?.value ?? null;

            if (!sessionId) {
                return {
                    user: null, 
                    session: null
                }
            }

            // validate the session
            const result = await lucia.validateSession(sessionId);

            try {
                if (result.session && result.session.fresh) {
                    const sessionCookie = lucia.createSessionCookie(result.session.id);
                    const cookieStore = await cookies()
                    cookieStore.set(
                        sessionCookie.name, 
                        sessionCookie.value, 
                        sessionCookie.attributes
                    )
                }

                if (!result.session) {
                    const sessionCookie = lucia.createBlankSessionCookie();
                    const cookieStore = await cookies()
                    cookieStore.set(
                        sessionCookie.name, 
                        sessionCookie.value, 
                        sessionCookie.attributes
                    )
                }
            } catch (error) {
                console.error("Error while setting cookie: ", error)
            }

            return result
        },
);