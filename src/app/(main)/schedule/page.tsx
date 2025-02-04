"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
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
import { Schedules } from "@prisma/client";
import { loadSchedules } from "./loadSchedules";
import { useOrganization } from "@/app/contexts/OrganizationContext";
import { useToast } from "@/components/hooks/use-toast";
import { deleteSchedule } from "./delete/action";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function SchedulesPage() {
  // fetch the selected organization
  const { selectedOrg } = useOrganization();
  const [schedules, setSchedules] = useState<Schedules[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchSchedules() {
      if (!selectedOrg) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const result = await loadSchedules(selectedOrg.id);
        if ("error" in result) {
          setError(result.error);
        } else {
          setSchedules(result);
          setError(null);
        }
      } catch (err) {
        setError("An unexpected error occurred");
        console.log(err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchSchedules();
  }, [selectedOrg]);

  const handleDeleteSchedule = async (scheduleId: string) => {
    const result = await deleteSchedule(scheduleId);
    if (result.success) {
      toast({
        title: "Success",
        description: result.message,
      });
      // Refresh the schedules list
      const updatedSchedules = schedules.filter((s) => s.id !== scheduleId);
      setSchedules(updatedSchedules);
    } else {
      toast({
        title: "Error",
        description: result.message,
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!selectedOrg)
    return <h1>Please Select or Create an Organization first!</h1>;

  if (error) {
    return <h1>Something went wrong</h1>;
  }

  return (
    <div className="container mx-auto py-10">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Schedules</h1>
        <Button asChild>
          <Link href="/schedule/create">
            <Plus className="mr-2 h-4 w-4" />
            New
          </Link>
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {schedules.map((schedule) => (
            <TableRow key={schedule.id}>
              <TableCell className="font-medium">{schedule.name}</TableCell>
              <TableCell>
                {new Date(schedule.createdAt).toLocaleDateString()}
              </TableCell>
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
                      onClick={() => navigator.clipboard.writeText(schedule.id)}
                    >
                      Copy schedule ID
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href={`/schedule/edit/${schedule.id}`}>
                        Edit schedule
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={`/schedule/edit/${schedule.id}`}>
                        View schedule
                      </Link>
                    </DropdownMenuItem>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <DropdownMenuItem 
                          onSelect={(e) => e.preventDefault()}
                          className="text-red-600"
                        >
                          Delete schedule
                        </DropdownMenuItem>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Are you absolutely sure?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently
                            delete the schedule and all related data.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteSchedule(schedule.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
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
