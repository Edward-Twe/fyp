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
import { CardContent, CardFooter, Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import LoadingButton from "@/components/Loadingbutton";
import { useOrganization } from "@/app/contexts/OrganizationContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/hooks/use-toast";
import { CreateMessage } from "../../updates/action";
import { Clock, AlertCircle, CheckCircle2, Ruler, ClipboardList } from "lucide-react";
import Link from "next/link";

export default function TaskForm() {
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();
  const { selectedOrg } = useOrganization();
  const { toast } = useToast();
  const router = useRouter();

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
  }, [selectedOrg, form])

  const onSubmit: SubmitHandler<TaskValues> = (values) => {
    setError(undefined);
    console.log("Form submitted", values);
    startTransition(async () => {
      try {
        const result = await createTask(values);
        if (result && result.error) {
          toast({
            title: "Error",
            description: `Error creating task`,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Success",
            description: `Successfully created task`,
          });
          const messageResult = await CreateMessage(`created new Task: ${values.task}`, selectedOrg!)
          if (messageResult && messageResult.error) {
            toast({
              title: "Error",
              description: `Error creating update message`,
              variant: "destructive",
            });
          }
          router.push("/tasks");
        }
      } catch (err) {
        console.error("Error creating task:", err);
        setError("An unexpected error occurred. Please try again.");
      }
    });
  };

  const onButtonClick = () => {
    const formData = form.getValues();
    onSubmit(formData);
  };

  if (!selectedOrg) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center p-8 text-center">
        <div className="glass-card max-w-md p-8 animate-fade-in">
          <div className="mb-6 text-theme-blue-500 dark:text-theme-blue-400">
            <ClipboardList className="mx-auto h-16 w-16" />
          </div>
          <h1 className="mb-4 text-2xl font-bold text-gradient">Organization Required</h1>
          <p className="mb-6 text-muted-foreground">Please select or create an organization to create tasks.</p>
          <Link href="/organizations" className="btn-primary inline-flex items-center justify-center w-full">
            Go to Organizations
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto py-10 px-4 animate-fade-in">
      <div className="mb-8 flex items-center gap-3">
        <div className="rounded-full bg-theme-blue-100 p-3 dark:bg-theme-blue-900/30">
          <ClipboardList className="h-6 w-6 text-theme-blue-600 dark:text-theme-blue-400" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gradient">Create New Task</h1>
          <p className="text-sm text-muted-foreground">Add a new task to your organization&apos;s workflow</p>
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
                  name="task"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium flex items-center gap-1.5">
                        <ClipboardList className="h-4 w-4 text-theme-blue-500" />
                        Task Name
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter descriptive task name"
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
                  <Clock className="h-4 w-4" />
                  Time Requirements
                </h3>

                <div className="flex space-x-3">
                  <FormField
                    control={form.control}
                    name="requiredTimeValue"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel className="text-xs text-muted-foreground">Duration</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Enter time value"
                            {...field}
                            value={field.value || 0}
                            className="input-field focus:border-theme-blue-300"
                          />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="requiredTimeUnit"
                    render={({ field }) => (
                      <FormItem className="w-1/3">
                        <FormLabel className="text-xs text-muted-foreground">Unit</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="input-field focus:border-theme-blue-300">
                              <SelectValue placeholder="Select unit" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="glass-effect">
                            <SelectItem value="minutes">Minutes</SelectItem>
                            <SelectItem value="hours">Hours</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="bg-theme-blue-50/50 dark:bg-theme-blue-900/10 rounded-lg p-4">
                <h3 className="text-sm font-medium text-theme-blue-700 dark:text-theme-blue-300 flex items-center gap-1.5 mb-4">
                  <Ruler className="h-4 w-4" />
                  Space Requirements
                </h3>

                <FormField
                  control={form.control}
                  name="spaceNeeded"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-muted-foreground">Space Needed</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Enter space required for this task"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value))}
                          className="input-field focus:border-theme-blue-300"
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>
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
                    Create Task
                  </>
                )}
              </LoadingButton>

              <Link
                href="/tasks"
                className="text-sm text-center text-muted-foreground hover:text-theme-blue-600 dark:hover:text-theme-blue-400 transition-colors"
              >
                Cancel and return to tasks
              </Link>
            </CardFooter>
          </form>
        </Form>
      </Card>

      <div className="mt-6 text-center">
        <p className="text-xs text-muted-foreground">
          Tasks will be available for assignment to your schedules after creation
        </p>
      </div>
    </div>
  );
}
