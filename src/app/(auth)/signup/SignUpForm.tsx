"use client";

import { signUpSchema, SignUpValues } from "@/lib/validation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useState, useTransition } from "react";
import { signUp } from "./actions";
import { PasswordInput } from "@/components/PasswordInput";
import LoadingButton from "@/components/Loadingbutton";
import { useOrganization } from "@/app/contexts/OrganizationContext";

export default function SignUpForm() {
  // to get the error sent from the backend
  const [error, setError] = useState<string>();
  const { clearSelectedOrg } = useOrganization()

  // should be used for server actions within client component. make sure server action is finished before making transitions.
  const [isPending, startTransition] = useTransition();

  const form = useForm<SignUpValues>({
    //make sure input is valid
    resolver: zodResolver(signUpSchema),
    // make sure the default value is not undefined, since undefined doesnt trigger the schema.
    defaultValues: {
      email: "",
      password: "",
      username: "",
    },
  });

  async function onSubmit(values: SignUpValues) {
    setError(undefined);
    localStorage.clear()
    await clearSelectedOrg()
    startTransition(async () => {
      const { error } = await signUp(values);
      if (error) setError(error);
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="grid gap-4">
          <div className="grid gap-1">
            {/* if error is non-empty, show the error */}
            {error && <p className="text-center text-destructive">{error}</p>}
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input placeholder="Username" {...field} />
                  </FormControl>
                  {/* to show error message */}
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="Email" type="email" {...field} />
                  </FormControl>
                  {/* to show error message */}
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <PasswordInput placeholder="Password" {...field} />
                  </FormControl>
                  {/* to show error message */}
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <LoadingButton loading={isPending} type="submit">
            Create Account
          </LoadingButton>
        </div>
      </form>
    </Form>
  );
}
