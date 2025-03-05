"use client";

import { employeeSchema, EmployeeValues } from "@/lib/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition, useRef } from "react";
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
import { useRouter } from "next/navigation";
import { useToast } from "@/components/hooks/use-toast";
import { StandaloneSearchBox } from "@react-google-maps/api";
import { useGoogleMaps } from "@/components/GoogleMapsProvider";
import { CreateMessage } from "../../updates/action";
import { checkExistingEmployeeInOrg, findUserByEmail } from "../edit/[id]/action";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function EmpForm() {
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();
  const { selectedOrg } = useOrganization();
  const router = useRouter();
  const { toast } = useToast();
  const addressInputRef = useRef<HTMLInputElement>(null);
  const searchBoxRef = useRef<google.maps.places.SearchBox | null>(null);
  const { isLoaded, loadError } = useGoogleMaps();

  const form = useForm<EmployeeValues>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      name: "",
      email: "",
      area: "",
      areaLat: 0,
      areaLong: 0,
      space: 0.0,
    },
  });

  const handlePlaceChanged = () => {
    const places = searchBoxRef.current?.getPlaces();
    if (places && places.length > 0) {
      const place = places[0];
      form.setValue("area", place.formatted_address || "");
      form.setValue("areaLat", place.geometry?.location?.lat() || 0);
      form.setValue("areaLong", place.geometry?.location?.lng() || 0);
    }
  };

  const onSubmit: SubmitHandler<EmployeeValues> = async (values) => {
    setError(undefined);

    // Validate form before proceeding
    const validationResult = await form.trigger();
    if (!validationResult) {
      return; // Stop if validation fails
    }

    startTransition(async () => {
      try {
        //check if email exists
        if (values.email) {
          const existingUser = await findUserByEmail(values.email);
          if (!existingUser) {
            toast({
              title: "Error",
              description:
                "Email is not registered. Please enter a registered email to invite the user.",
              variant: "destructive",
            });
            return;
          }

          const emailOcupied = await checkExistingEmployeeInOrg(values.email, values.orgId);

          if(emailOcupied) {
            toast({
              title: "Error",
              description:
                "Email is already used by other employee in this organization.",
              variant: "destructive",
            });
            return;
          }
        }

        const result = await createEmployee(values);
        if (result && result.error) {
          toast({
            title: "Error",
            description: `Error creating employee`,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Success",
            description: `Successfully created employee`,
          });
          const messageResult = await CreateMessage(`created new Employee: ${values.name}`, selectedOrg!)
          if (messageResult && messageResult.error) {
            toast({
              title: "Error",
              description: `Error creating update message`,
              variant: "destructive",
            });
          }
          router.push("/employees");
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
                      onChange={(e) => {
                        field.onChange(e);
                        if (!e.target.value) {
                          // Clear role when email is empty
                          form.setValue("role", undefined);
                        }
                      }}
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
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select
                    disabled={!form.watch("email")}
                    onValueChange={field.onChange}
                    value={field.value}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className={form.formState.errors.role ? "border-red-500" : ""}>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage>
                    {form.formState.errors.role && form.formState.errors.role.message}
                  </FormMessage>
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
                    {isLoaded ? (
                      <StandaloneSearchBox
                        onLoad={(ref) => {
                          searchBoxRef.current = ref;
                        }}
                        onPlacesChanged={handlePlaceChanged}
                      >
                        <Input
                          {...field}
                          ref={addressInputRef}
                          value={field.value ?? ""}
                        />
                      </StandaloneSearchBox>
                    ) : (
                      <Input
                        {...field}
                        disabled
                        placeholder="Loading Google Maps..."
                        value={field.value ?? ""}
                      />
                    )}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {loadError && (
            <FormMessage>
              Failed to load Google Maps. Please try again later.
            </FormMessage>
          )}
          </div>
          <div className="space-y-2">
            <FormField
              control={form.control}
              name="space"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Space</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Enter space available"
                      {...field}
                    />
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
