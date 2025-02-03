"use client";

import { updateJobOrderSchema, UpdateJobOrderValues } from "@/lib/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState, useTransition, useRef } from "react";
import { SubmitHandler, useForm, Controller } from "react-hook-form";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useOrganization } from "@/app/contexts/OrganizationContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { loadTasks } from "@/app/(main)/tasks/loadTasks";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import LoadingButton from "@/components/Loadingbutton";
import { CardContent, CardFooter } from "@/components/ui/card";
import { StandaloneSearchBox } from "@react-google-maps/api";
import { useGoogleMaps } from "@/components/GoogleMapsProvider";
import { editJobOrder, findJobOrder } from "./action";
import { useToast } from "@/components/hooks/use-toast";
import { useRouter } from "next/navigation";

interface Task {
  id: string;
  task: string;
  requiredTimeValue: number;
  requiredTimeUnit: "minutes" | "hours";
  spaceNeeded: number;
}

export default function JobOrderForm({ id }: { id: string }) {
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();
  const [availableTasks, setAvailableTasks] = useState<Task[]>([]);
  const { selectedOrg } = useOrganization();
  const addressInputRef = useRef<HTMLInputElement>(null);
  const searchBoxRef = useRef<google.maps.places.SearchBox | null>(null);
  const { isLoaded, loadError } = useGoogleMaps();
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<UpdateJobOrderValues>({
    resolver: zodResolver(updateJobOrderSchema),
    defaultValues: {
      id: "",
      orderNumber: "",
      address: "",
      city: "",
      postCode: "",
      state: "",
      country: "",
      latitude: 0,
      longitude: 0,
      placeId: "", 
      orgId: selectedOrg?.id || "",
      tasks: [],
      spaceRequried: 0,
    },
  });

  useEffect(() => {
    if (!id) {
      setError("No ID provided.");
      setIsLoading(false);
      return;
    }

    const getJobOrder = async () => {
      try {
        const fetchedJobOrder = await findJobOrder(id as string);
        if (!fetchedJobOrder) {
          setError("Job order doesn't exist.");
        } else {
          form.reset({
            id: fetchedJobOrder.id,
            orderNumber: fetchedJobOrder.orderNumber,
            address: fetchedJobOrder.address,
            city: fetchedJobOrder.city,
            postCode: fetchedJobOrder.postCode,
            state: fetchedJobOrder.state,
            country: fetchedJobOrder.country,
            latitude: Number(fetchedJobOrder.latitude),
            longitude: Number(fetchedJobOrder.longitude),
            placeId: fetchedJobOrder.placeId, 
            orgId: fetchedJobOrder.orgId,
            tasks: fetchedJobOrder.JobOrderTask.map((jot) => ({
              taskId: jot.taskId,
              quantity: jot.quantity,
            })),
            spaceRequried: Number(fetchedJobOrder.spaceRequried),
          });
        }
      } catch (err) {
        console.error("Error during fetch:", err);
        setError("Failed to fetch job order.");
      } finally {
        setIsLoading(false);
      }
    };

    getJobOrder();

    if (selectedOrg?.id) {
      loadTasks(selectedOrg.id).then((tasks) => {
        if (Array.isArray(tasks)) {
          setAvailableTasks(tasks);
        } else {
          setError("Failed to load tasks");
        }
      });
    }
  }, [selectedOrg, id, form]);

  const handlePlaceChanged = () => {
    const places = searchBoxRef.current?.getPlaces();
    if (places && places.length > 0) {
      const place = places[0];
      const addressComponents = place.address_components;

      if (addressComponents) {
        const getAddressComponent = (
          components: google.maps.GeocoderAddressComponent[],
          type: string,
        ): string | null => {
          const component = components.find((c) => c.types.includes(type));
          return component ? component.long_name : null;
        };

        // Extract city, postcode, and state
        const city = getAddressComponent(addressComponents, "locality");
        const postcode = getAddressComponent(addressComponents, "postal_code");
        const state = getAddressComponent(
          addressComponents,
          "administrative_area_level_1",
        );
        const country = getAddressComponent(addressComponents, "country");
        const placeId = place.place_id as string;

        form.setValue("city", city || "");
        form.setValue("postCode", postcode || "");
        form.setValue("state", state || "");
        form.setValue("country", country || "");
        form.setValue("address", place.formatted_address || "");
        form.setValue("latitude", place.geometry?.location?.lat() || 0);
        form.setValue("longitude", place.geometry?.location?.lng() || 0);
        form.setValue("placeId", placeId || "");
      }
    }
  };

  const calculateTotalTime = () => {
    return form.getValues("tasks").reduce((total, selectedTask) => {
      const task = availableTasks.find((t) => t.id === selectedTask.taskId);
      if (!task) return total;

      const timeInMinutes =
        task.requiredTimeUnit === "hours"
          ? task.requiredTimeValue * 60
          : task.requiredTimeValue;

      return total + timeInMinutes * selectedTask.quantity;
    }, 0);
  };

  const calculateTotalSpace = () => {
    return form.getValues("tasks").reduce((total, selectedTask) => {
      const task = availableTasks.find((t) => t.id === selectedTask.taskId);
      if (!task) return total;
      return total + task.spaceNeeded * selectedTask.quantity;
    }, 0);
  };

  const formatTotalTime = (totalMinutes: number) => {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.round(totalMinutes % 60);
    return `${hours}h ${minutes}m`;
  };

  const handleAddTask = () => {
    const currentTasks = form.getValues("tasks");
    form.setValue("tasks", [...currentTasks, { taskId: "", quantity: 1 }]);
  };

  const handleRemoveTask = (index: number) => {
    const currentTasks = form.getValues("tasks");
    form.setValue(
      "tasks",
      currentTasks.filter((_, i) => i !== index),
    );
  };

  const onSubmit: SubmitHandler<UpdateJobOrderValues> = async (values) => {
    values.spaceRequried = calculateTotalSpace();
    setError(undefined);
    startTransition(async () => {
      try {
        const result = await editJobOrder(values);
        if (result && result.error) {
          toast({
            title: "Error",
            description: `Error updating job order #${values.id}`,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Success",
            description: `Successfully updated job order #${values.id}`,
          });
          router.push("/job-orders");
        }
      } catch (err) {
        console.error("Error updating job order:", err);
        setError("An unexpected error occurred. Please try again.");
      }
    });
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!selectedOrg) {
    return <h1>Please Select or Create an Organization First!</h1>;
  }

  if (error) {
    return <h1>{error}</h1>;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <CardContent>
          <FormField
            control={form.control}
            name="orderNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Order Number</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Address</FormLabel>
                <FormControl>
                  {isLoaded ? (
                    <StandaloneSearchBox
                      onLoad={(ref) => {
                        searchBoxRef.current = ref;
                      }}
                      onPlacesChanged={handlePlaceChanged}
                    >
                      <Input {...field} ref={addressInputRef} />
                    </StandaloneSearchBox>
                  ) : (
                    <Input
                      {...field}
                      disabled
                      placeholder="Loading Google Maps..."
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

          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Tasks</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddTask}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Task
              </Button>
            </div>

            {form.watch("tasks").map((task, index) => (
              <div key={index} className="flex items-start space-x-4">
                <div className="flex-1">
                  <Controller
                    name={`tasks.${index}.taskId`}
                    control={form.control}
                    render={({ field }) => (
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a task" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableTasks.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.task}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <div className="w-24">
                  <Controller
                    name={`tasks.${index}.quantity`}
                    control={form.control}
                    render={({ field }) => (
                      <Input
                        type="number"
                        min="1"
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseInt(e.target.value, 10) || 0)
                        }
                      />
                    )}
                  />
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveTask(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}

            {form.watch("tasks").length > 0 && (
              <div className="mt-4 space-y-2 rounded-lg bg-muted p-4">
                <p className="text-sm font-medium">
                  Total Time Required: {formatTotalTime(calculateTotalTime())}
                </p>
                <p className="text-sm font-medium">
                  Total Space Required: {calculateTotalSpace()}
                </p>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <LoadingButton loading={isPending} type="submit" className="w-full">
            Edit Job Order
          </LoadingButton>
        </CardFooter>
      </form>
    </Form>
  );
}
