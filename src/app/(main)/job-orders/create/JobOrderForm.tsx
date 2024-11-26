"use client";

import { jobOrderSchema, JobOrderValues, taskSchema, TaskValues } from "@/lib/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState, useTransition } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { createJobOrder } from "./action";
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
import { loadTasks } from "../../tasks/loadTasks";
import { Tasks } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";

interface Task {
  id: string
  task: string
  requiredTimeValue: number
  requiredTimeUnit: "minutes" | "hours"
  spaceNeeded: number
}

interface JobOrderProps {
  tasks: Task[]
  onSubmit: (data: JobOrderValues) => void
}

export default function JobOrderForm() {
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();
  const [availableTasks, setAvailableTasks] = useState<Task[]>([]);
  const { selectedOrg } = useOrganization();
  const [selectedTasks, setSelectedTasks] = useState<
    Array<{ taskId: string; quantity: number }>
  >([])
  const [totalRequiredTime, setTotalRequiredTime] = useState(0)

  const form = useForm<JobOrderValues>({
    resolver: zodResolver(jobOrderSchema),

    defaultValues: {
      orderNumber: "", 
      address: "", 
      orgId: selectedOrg?.id,
      tasks: []
    },
  });

  useEffect(() => {
    form.reset({
      orderNumber: "", 
      address: "", 
      orgId: selectedOrg?.id,
      tasks: []
    })
    if (selectedOrg?.id) {
      loadTasks(selectedOrg.id).then((tasks) => {
        if (Array.isArray(tasks)) {
          setAvailableTasks(tasks);
        } else {
          setError("Failed to load tasks");
        }
      });
    }
  }, [selectedOrg])

  const calculateTotalTime = () => {
    return selectedTasks.reduce((total, selectedTask) => {
      const task = availableTasks.find((t) => t.id === selectedTask.taskId)
      if (!task) return total

      const timeInMinutes =
        task.requiredTimeUnit === "hours"
          ? task.requiredTimeValue * 60
          : task.requiredTimeValue

      return total + timeInMinutes * selectedTask.quantity
    }, 0)
  }

  const formatTotalTime = (totalMinutes: number) => {
    const hours = Math.floor(totalMinutes / 60)
    const minutes = Math.round(totalMinutes % 60)
    return `${hours}h ${minutes}m`
  }

  const handleAddTask = () => {
    setSelectedTasks([...selectedTasks, { taskId: "", quantity: 1 }])
  }

  const handleRemoveTask = (index: number) => {
    setSelectedTasks(selectedTasks.filter((_, i) => i !== index))
  }

  const handleTaskChange = (index: number, taskId: string) => {
    const newTasks = [...selectedTasks]
    newTasks[index].taskId = taskId
    setSelectedTasks(newTasks)
    form.setValue("tasks", newTasks)
  }

  const handleQuantityChange = (index: number, quantity: string) => {
    const newTasks = [...selectedTasks]
    newTasks[index].quantity = parseInt(quantity, 10) || 0
    setSelectedTasks(newTasks)
    form.setValue("tasks", newTasks)
  }

  const onSubmit: SubmitHandler<JobOrderValues> = (values) => {
    setError(undefined);
    console.log("Form submitted", values);
    startTransition(async () => {
      try {
        const result = await createJobOrder(values);
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
      <form onSubmit={form.handleSubmit(onButtonClick)} className="space-y-6">
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
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Tasks</h3>
            <Button type="button" variant="outline" size="sm" onClick={handleAddTask}>
              <Plus className="mr-2 h-4 w-4" />
              Add Task
            </Button>
          </div>

          {selectedTasks.map((task, index) => (
            <div key={index} className="flex items-start space-x-4">
              <div className="flex-1">
                <Select
                  value={task.taskId}
                  onValueChange={(value) => handleTaskChange(index, value)}
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
              </div>

              <div className="w-24">
                <Input
                  type="number"
                  min="1"
                  value={task.quantity}
                  onChange={(e) => handleQuantityChange(index, e.target.value)}
                  placeholder="Qty"
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

          {selectedTasks.length > 0 && (
            <div className="mt-4 rounded-lg bg-muted p-4">
              <p className="text-sm font-medium">
                Total Time Required: {formatTotalTime(calculateTotalTime())}
              </p>
            </div>
          )}
        </div>

        <Button type="submit">Create Job Order</Button>
      </form>
    </Form>
  );
}
