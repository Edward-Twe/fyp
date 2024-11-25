"use client";

import { taskSchema, TaskValues } from "@/lib/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState, useTransition } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { createTask } from "./action";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function TaskForm() {
  const [error, setError] = useState<string>();

  const [isPending, startTransition] = useTransition();

  const { selectedOrg } = useOrganization();

  const form = useForm<TaskValues>({
    resolver: zodResolver(taskSchema),

    defaultValues: {
      task: "",
      requiredTimeValue: 0.0,
      requiredTimeUnit: "minutes",
      spaceNeeded: 0.0,
      orgId: selectedOrg?.id,
    },
  });

  useEffect(() => {
    form.reset({
      task: "",
      requiredTimeValue: 0.0,
      requiredTimeUnit: "minutes",
      spaceNeeded: 0.0,
      orgId: selectedOrg?.id
    })
  }, [selectedOrg])

  const onSubmit: SubmitHandler<TaskValues> = (values) => {
    setError(undefined);
    console.log("Form submitted", values);
    startTransition(async () => {
      try {
        const result = await createTask(values);
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
              name="task"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Task Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter task name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="space-y-2">
            <FormField
              control={form.control}
              name="requiredTimeValue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Required Time</FormLabel>
                  <FormControl>
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <Input
                        type="number"
                        placeholder="Enter estimated time to finish task"
                        {...field}
                        style={{ flex: 1, marginRight: "8px" }} 
                      />
                      <Select
                        {...form.register("requiredTimeUnit")}
                        defaultValue="minutes"
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue placeholder="Unit" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="minutes">Minutes</SelectItem>
                          <SelectItem value="hours">Hours</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="space-y-2">
            <FormField
              control={form.control}
              name="spaceNeeded"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Space Needed</FormLabel>
                  <FormControl>
                    <Input
                    type="number"
                      placeholder="Enter space needed for the task"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="space-y-2">
          </div>
        </CardContent>
        <CardFooter>
          <LoadingButton
            type="button"
            onClick={onButtonClick}
            className="w-full"
            loading={isPending}
          >
            Create Task
          </LoadingButton>
        </CardFooter>
      </form>
    </Form>
  );
}
