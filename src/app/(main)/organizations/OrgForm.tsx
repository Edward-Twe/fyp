"use client";

import { organizationSchema, OrganizationValues } from "@/lib/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { createOrganization } from "./action";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import LoadingButton from "@/components/Loadingbutton";

export default function OrgForm() {
  const [error, setError] = useState<string>();

  const [isPending, startTransition] = useTransition();

  const form = useForm<OrganizationValues>({
    resolver: zodResolver(organizationSchema),

    defaultValues: {
      name: "",
      email: "",
      location: "",
      logoUrl: "",
    },
  });

  const onSubmit: SubmitHandler<OrganizationValues> = (values) => {
    setError(undefined);
    console.log("Form submitted", values);
    startTransition(async () => {
      try {
        const result = await createOrganization(values);
        if ('error' in result && result.error) {
          setError(result.error);
        } else {
          console.log("Organization created successfully", result);
          // Handle successful creation (e.g., show a success message, redirect)
        }
      } catch (err) {
        console.error("Error creating organization:", err);
        setError("An unexpected error occurred. Please try again.");
      }
    });
  };

  const onButtonClick = () => {
    const formData = form.getValues();
    console.log("Button clicked, form data:", formData);
    onSubmit(formData);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          {error && <p className="text-center text-destructive">{error}</p>}
          <div className="space-y-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Organization Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter company name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="space-y-2">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Organization Email</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter company email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="space-y-2">
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Organization Location</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter company location" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="space-y-2">
            {/* <Label htmlFor="logo">Company Logo</Label> */}
            {/* <div className="flex items-center space-x-4">
                <Button 
                  type="button" 
                  variant="outline" 
                >
                  <Upload className="mr-2 h-4 w-4" /> Upload Logo
                </Button>
                <Input 
                  id="logo" 
                  type="file" 
                  className="hidden" 
                  onChange={handleLogoChange} 
                  accept="image/*"
                />
                {logoPreview && (
                  <div className="relative w-16 h-16">
                    <img 
                      src={logoPreview} 
                      alt="Logo preview" 
                      className="w-full h-full object-cover rounded-md"
                    />
                  </div>
                )}
              </div> */}
          </div>
        </CardContent>
        <CardFooter>
          <LoadingButton type="button" onClick={onButtonClick} className="w-full" loading={isPending}>
            Create Organization
          </LoadingButton>
        </CardFooter>
      </form>
    </Form>
  );
}
