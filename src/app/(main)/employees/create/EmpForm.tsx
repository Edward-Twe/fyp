"use client";

import { employeeSchema, EmployeeValues } from "@/lib/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { createEmployee } from "./action";
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
import { useOrganization } from "@/app/contexts/OrganizationContext";

export default function OrgForm() {
  const [error, setError] = useState<string>();

  const [isPending, startTransition] = useTransition();

  const { selectedOrg } = useOrganization();

  const form = useForm<EmployeeValues>({
    resolver: zodResolver(employeeSchema),

    defaultValues: {
      name: "",
      email: "",
      area: "",
    },
  });

  const onSubmit: SubmitHandler<EmployeeValues> = (values) => {
    setError(undefined);
    console.log("Form submitted", values);
    startTransition(async () => {
      try {
        const result = await createEmployee(values);
        if ("error" in result && result.error) {
          setError(result.error);
        } else {
          console.log("Employee created successfully", result);
          // Handle successful creation (e.g., show a success message, redirect)
        }
      } catch (err) {
        console.error("Error creating employee:", err);
        setError("An unexpected error occurred. Please try again.");
      }
    });
  };

  const onButtonClick = () => {
    const formData = form.getValues();
    console.log("Button clicked, form data:", formData);
    onSubmit(formData);
  };

  if (!selectedOrg) {
    return <h1>Please Select or Create an Organization First!</h1>;
  }

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
                  <FormLabel>Employee Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter employee name" {...field} />
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
                  <FormLabel>Employee Email</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter employee email"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="space-y-2">
            <FormField
              control={form.control}
              name="area"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Employee Area</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter employee area" {...field} value={field.value ?? ""}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <Input
            type="hidden"
            {...form.register("orgId")}
            value={selectedOrg.id}
          />
          <div className="space-y-2">
            {/* <Label htmlFor="logo">employee Logo</Label> */}
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
          <LoadingButton
            type="button"
            onClick={onButtonClick}
            className="w-full"
            loading={isPending}
          >
            Create Employee
          </LoadingButton>
        </CardFooter>
      </form>
    </Form>
  );
}
