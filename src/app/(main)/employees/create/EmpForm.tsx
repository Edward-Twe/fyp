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
import Link from "next/link";
import { User, Mail, MapPin, AlertCircle, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";

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
    return (
      <div className="flex h-full w-full flex-col items-center justify-center p-8 text-center">
        <div className="glass-card max-w-md p-8 animate-fade-in">
          <div className="mb-6 text-theme-blue-500 dark:text-theme-blue-400">
            <User className="mx-auto h-16 w-16" />
          </div>
          <h1 className="mb-4 text-2xl font-bold text-gradient">Organization Required</h1>
          <p className="mb-6 text-muted-foreground">Please select or create an organization to add employees.</p>
          <Link href="/organizations" className="btn-primary inline-flex items-center justify-center w-full">
            Go to Organizations
          </Link>
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center p-8 text-center">
        <div className="glass-card max-w-md p-8 animate-fade-in">
          <div className="mb-6 text-red-500">
            <MapPin className="mx-auto h-16 w-16" />
          </div>
          <h1 className="mb-4 text-2xl font-bold">Google Maps Error</h1>
          <p className="mb-6 text-muted-foreground">
            There was an error loading Google Maps. Please check your internet connection and try again.
          </p>
          <div className="flex gap-3">
            <button 
              onClick={() => window.location.reload()} 
              className="btn-primary flex-1 inline-flex items-center justify-center"
            >
              Retry
            </button>
            <Link 
              href="/employees" 
              className="btn-secondary flex-1 inline-flex items-center justify-center"
            >
              Go Back
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container max-w-2xl mx-auto py-10 px-4 animate-fade-in">
      <div className="mb-8 flex items-center gap-3">
        <div className="rounded-full bg-theme-blue-100 p-3 dark:bg-theme-blue-900/30">
          <User className="h-6 w-6 text-theme-blue-600 dark:text-theme-blue-400" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gradient">Add Employee</h1>
          <p className="text-sm text-muted-foreground">Create a new employee profile</p>
        </div>
      </div>

      <Card className="glass-card overflow-hidden border-theme-blue-100/50 dark:border-theme-blue-900/30">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6 p-6">
              {error && (
                <div className="rounded-lg bg-red-50 p-4 text-red-600 dark:bg-red-900/20 dark:text-red-400 flex items-center gap-2 animate-fade-in">
                  <AlertCircle className="h-5 w-5" />
                  <p>{error}</p>
                </div>
              )}

              <div className="space-y-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium flex items-center gap-1.5">
                        <User className="h-4 w-4 text-theme-blue-500" />
                        Employee Name
                      </FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter employee name" 
                          {...field} 
                          className="input-field focus:border-theme-blue-300"
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>

              <div className="bg-theme-blue-50/50 dark:bg-theme-blue-900/10 rounded-lg p-4 space-y-4">
                <h3 className="text-sm font-medium text-theme-blue-700 dark:text-theme-blue-300 flex items-center gap-1.5">
                  <Mail className="h-4 w-4" />
                  Contact Information
                </h3>
                
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-muted-foreground">Email Address</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter employee email"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => {
                            field.onChange(e);
                            if (!e.target.value) {
                              form.setValue("role", undefined);
                            }
                          }}
                          className="input-field focus:border-theme-blue-300"
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-muted-foreground">Role</FormLabel>
                      <Select
                        disabled={!form.watch("email")}
                        onValueChange={field.onChange}
                        value={field.value}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className={`input-field focus:border-theme-blue-300 ${form.formState.errors.role ? "border-red-500" : ""}`}>
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="glass-effect">
                          <SelectItem value="user">User</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>

              <div className="bg-theme-blue-50/50 dark:bg-theme-blue-900/10 rounded-lg p-4 space-y-4">
                <h3 className="text-sm font-medium text-theme-blue-700 dark:text-theme-blue-300 flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  Location Details
                </h3>

                <FormField
                  control={form.control}
                  name="area"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-muted-foreground">Area</FormLabel>
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
                              className="input-field focus:border-theme-blue-300"
                              placeholder="Search for location..."
                            />
                          </StandaloneSearchBox>
                        ) : (
                          <Input
                            {...field}
                            disabled
                            placeholder="Loading Google Maps..."
                            value={field.value ?? ""}
                            className="input-field"
                          />
                        )}
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="space"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-muted-foreground">Available Space</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Enter available space"
                          {...field}
                          className="input-field focus:border-theme-blue-300"
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
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
            
            <CardFooter className="flex flex-col gap-3 border-t border-theme-blue-100/50 dark:border-theme-blue-900/30 bg-theme-blue-50/50 dark:bg-theme-blue-900/10 p-6">
              <LoadingButton
                type="button"
                onClick={onButtonClick}
                className="btn-primary w-full flex items-center justify-center gap-2"
                loading={isPending}
              >
                {!isPending && (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Create Employee
                  </>
                )}
              </LoadingButton>
              
              <Link 
                href="/employees" 
                className="text-sm text-center text-muted-foreground hover:text-theme-blue-600 dark:hover:text-theme-blue-400 transition-colors"
              >
                Cancel and return to employees
              </Link>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  )
}
