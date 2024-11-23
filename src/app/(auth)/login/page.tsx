import { Metadata } from "next";
import Image from "next/image";
import signUpImage from "@/assets/signupimg.jpg";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import LoginForm from "./LoginForm";

export const metadata: Metadata = {
  title: "Login",
};

export default function Page() {
  return (
    <main className="flex min-h-screen bg-background">
      <div className="flex w-full overflow-hidden bg-card shadow-none">
        <div className="flex w-full flex-col justify-center space-y-6 p-8 sm:w-[350px] lg:w-1/2">
          <div className="flex flex-col space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">
              Login to AutoSched
            </h1>
            <p className="text-sm text-muted-foreground">
              Login with username and password.
            </p>
          </div>
          <div className="grid gap-6">
            <LoginForm />
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-muted"></span>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or
                </span>
              </div>
            </div>
            <Button variant="outline" asChild>
              <Link href="/signup">Create an account</Link>
            </Button>
          </div>
        </div>
        <div className="hidden bg-muted lg:block lg:w-1/2">
          <Image
            src={signUpImage}
            alt="Login page image"
            width={1920}
            height={1080}
            className="h-full w-full object-cover"
          />
        </div>
      </div>
    </main>
  );
}
