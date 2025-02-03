"use client";

import { loginSchema, LoginValues } from "@/lib/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { login } from "./actions";
import {
  Form, 
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/PasswordInput";
import LoadingButton from "@/components/Loadingbutton";
import { useOrganization } from "@/app/contexts/OrganizationContext"

export default function LoginForm() {
  const { clearSelectedOrg } = useOrganization()
  // to get the error sent from the backend
  const [error, setError] = useState<string>();

  // should be used for server actions within client component. make sure server action is finished before making transitions.
  const [isPending, startTransition] = useTransition();

  const form = useForm<LoginValues>({
    //make sure input is valid
    resolver: zodResolver(loginSchema),
    // make sure the default value is not undefined, since undefined doesnt trigger the schema.
    defaultValues: {
      password: "",
      username: "",
    },
  });

  async function onSubmit(values: LoginValues) {
    setError(undefined);
    startTransition(async () => {
      const { error } = await login(values);
      if (!error) {
        localStorage.clear()
        clearSelectedOrg()
      } else {
        setError(error)
      }
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
            Login
          </LoadingButton>
        </div>
      </form>
    </Form>
  );
}
