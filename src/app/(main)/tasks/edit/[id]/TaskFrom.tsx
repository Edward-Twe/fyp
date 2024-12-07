"use client";

import { updateTaskSchema, UpdateTaskValues } from "@/lib/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState, useTransition } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { editTask, findTask } from "./action";
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
import { Tasks } from "@prisma/client";

export default function EditTaskForm({ id }: { id: string }) {
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();
  const { selectedOrg } = useOrganization();
  const [task, setTask] = useState<Tasks | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const form = useForm<UpdateTaskValues>({
    resolver: zodResolver(updateTaskSchema),
    defaultValues: {
      id: "",
      task: "",
      requiredTimeValue: 0,
      requiredTimeUnit: "minutes",
      spaceNeeded: 0,
    },
  });

  useEffect(() => {
    if (!id) {
      console.log('no id');
      setError("No ID provided.");
      setIsLoading(false);
      return;
    }
    
    const getTask = async () => {
      try {
        const fetchedTask = await findTask(id);
        if (!fetchedTask) {
          setError("Task doesn't exist.");
          console.log("Error fetching task.");
        } else {
          setTask(fetchedTask);
          form.reset({
            id: fetchedTask.id,
            task: fetchedTask.task,
            requiredTimeValue: Number(fetchedTask.requiredTimeValue),
            requiredTimeUnit: fetchedTask.requiredTimeUnit,
            spaceNeeded: Number(fetchedTask.spaceNeeded),
          });
          console.log("Task fetched successfully:");
        }
      } catch (err) {
        console.error("Error during fetch:", err);
        setError("Failed to fetch task.");
      } finally {
        setIsLoading(false);
      }
    };

    getTask();
  }, [id, form]);

  if (isLoading) {
    return (<div>Loading...</div>);
  }

  if (task === null) {
    return (<h1>Task not Found</h1>);
  }

  const onSubmit: SubmitHandler<UpdateTaskValues> = (values) => {
    setError(undefined);
    console.log("Form submitted", values);
    startTransition(async () => {
      try {
        const result = await editTask(values);
        if ("error" in result && result.error) {
          setError(result.error);
        } else {
          console.log("Task edited successfully", result);
          // Handle successful edit (e.g., show a success message, redirect)
        }
      } catch (err) {
        console.error("Error editing task:", err);
        setError("An unexpected error occurred. Please try again.");
      }
    });
  };

  if (!selectedOrg) {
    return <h1>Please Select or Create an Organization First!</h1>;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          {error && <p className="text-center text-destructive">{error}</p>}
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
          <div className="flex space-x-2">
            <FormField
              control={form.control}
              name="requiredTimeValue"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel>Required Time</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Enter estimated time"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="requiredTimeUnit"
              render={({ field }) => (
                <FormItem className="w-1/3">
                  <FormLabel>Unit</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select unit" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="minutes">Minutes</SelectItem>
                      <SelectItem value="hours">Hours</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
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
                    onChange={(e) => field.onChange(parseFloat(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
        <CardFooter>
          <LoadingButton
            type="submit"
            className="w-full"
            loading={isPending}
          >
            Edit Task
          </LoadingButton>
        </CardFooter>
      </form>
    </Form>
  );
}

