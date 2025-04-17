"use client";

import { updateOrganizationSchema, UpdateOrganizationValues } from "@/lib/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState, useTransition } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { editOrganization, findOrganization } from "./action";

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
import { useToast } from "@/components/hooks/use-toast";
import { Organization } from "@prisma/client";


export default function OrgForm({ id }: { id: string }) {
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const form = useForm<UpdateOrganizationValues>({
    resolver: zodResolver(updateOrganizationSchema),
    defaultValues: {
      id: "",
      name: "",
      email: "",
      location: "",
    },
  });

  useEffect(() => {
    if (!id) {
      console.log("no id");
      setError("No ID provided.");
      setIsLoading(false);
      return;
    }

    const getOrganization = async () => {
      try {
        const fetchedOrg = await findOrganization(id);
        if (!fetchedOrg) {
          setError("Organization doesn't exist.");
          console.log("Error fetching organization.");
        } else {
          setOrganization(fetchedOrg);
          form.reset({
            id: fetchedOrg.id,
            name: fetchedOrg.name,
            email: fetchedOrg.email || "",
            location: fetchedOrg.location || ""
          });
          console.log("Organization fetched successfully:");
        }
      } catch (err) {
        console.error("Error during fetch:", err);
        setError("Failed to fetch organization.");
      } finally {
        setIsLoading(false);
      }
    };

    getOrganization();
  }, [id, form]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (organization === null) {
    return <h1>Organization not Found</h1>;
  }

  const onSubmit: SubmitHandler<UpdateOrganizationValues> = (values) => {
    setError(undefined);
    console.log("Form submitted", values);
    startTransition(async () => {

      try {
        const result = await editOrganization(values);
        if (result && result.error) {
          toast({

            title: "Error",
            description: `Error editing organization`,
            variant: "destructive",

          });
        } else {
          toast({
            title: "Success",
            description: `Successfully edited organization`,
          });
          window.location.href = '/';

        }
      } catch (err) {
        console.error("Error editing organization:", err);
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
                    <Input placeholder="Enter company name" {...field} value={field.value || ""} />
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
                    <Input placeholder="Enter company email" {...field} value={field.value || ""} />
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
                    <Input placeholder="Enter company location" {...field} value={field.value || ""} />
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
            Edit Organization
          </LoadingButton>
        </CardFooter>
      </form>

    </Form>
  );
}
