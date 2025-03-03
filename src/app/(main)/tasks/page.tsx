"use client";

import { useEffect, useState } from "react";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { Tasks } from "@prisma/client";
import { loadTasks } from "./loadTasks";
import { useOrganization } from "@/app/contexts/OrganizationContext";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { deleteTask } from "./delete/action";
import { toast } from "@/components/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { CreateMessage } from "../updates/action";

export default function TasksPage() {
  // fetch the selected organization
  const { selectedOrg } = useOrganization();
  const [tasks, setTasks] = useState<Tasks[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function fetchTasks() {
      if (!selectedOrg) {
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      try {
        const result = await loadTasks(selectedOrg.id);
        if ("error" in result) {
          setError(result.error);
        } else {
          setTasks(result);
          setError(null);
        }
      } catch (err) {
        setError("An unexpected error occurred");
        console.error("Error during fetch:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchTasks();
  }, [selectedOrg]);

  const handleDeleteTask = async (taskId: string, taskName: string) => {
    const result = await deleteTask(taskId)
    if (result.success) {
      toast({
        title: "Success",
        description: result.message,
      })
      const messageResult = await CreateMessage(`created new Employee: ${taskName}`, selectedOrg!)
          if (messageResult && messageResult.error) {
            toast({
              title: "Error",
              description: `Error creating update message`,
              variant: "destructive",
            });
          }
      const updatedTasks = tasks.filter((task) => task.id !== taskId)
      setTasks(updatedTasks)
    } else {
      toast({
        title: "Error",
        description: result.message,
        variant: "destructive",
      })
    }
  }

  // Filter tasks based on search query
  const filteredTasks = tasks.filter((task) =>
    task.task.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (error) {
    return <div>{error}</div>
  }

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!selectedOrg)
    return <h1>Please Select or Create an Organization first!</h1>;

  return (
    <div className="container mx-auto py-10">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
        <Button asChild>
          <Link href="/tasks/create">
            <Plus className="mr-2 h-4 w-4" />
            New
          </Link>
        </Button>
      </div>

      <div className="mb-6 space-y-4">
        <div className="flex gap-4">
          <div className="flex-1 relative max-w-sm">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search task name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Task</TableHead>
            <TableHead>Required Time</TableHead>
            <TableHead>Space Needed</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredTasks.map((task) => (
            <TableRow key={task.id}>
              <TableCell className="font-medium">{task.task}</TableCell>
              <TableCell>{task.requiredTimeValue.toString()} {task.requiredTimeUnit}</TableCell>
              <TableCell>{task.spaceNeeded.toString()}</TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem
                      onClick={() => navigator.clipboard.writeText(task.id)}
                    >
                      Copy task ID
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href={`/tasks/edit/${task.id}`}>
                        Edit task
                      </Link>
                    </DropdownMenuItem>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>Delete task</DropdownMenuItem>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the task and all related
                            data.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteTask(task.id, task.task)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
