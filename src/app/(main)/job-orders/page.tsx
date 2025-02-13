"use client";

import { useEffect, useState } from "react";
import { JobOrders, JobOrderTask, Tasks } from "@prisma/client";
import { loadJobOrders } from "./loadJobOrders";
import { useOrganization } from "@/app/contexts/OrganizationContext";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus, MoreHorizontal, Search } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { DateRangePicker } from "@/components/DateRangePicker";
import { isWithinInterval, endOfDay } from "date-fns";
import { DateRange } from "react-day-picker";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { deleteJobOrder } from "./delete/action";
import { useToast } from "@/components/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type JobOrderWithTasks = JobOrders & {
  JobOrderTask: (JobOrderTask & {
    task: Tasks
  })[]
}

export default function JobOrdersPage() {
  const { selectedOrg } = useOrganization();
  const [jobOrders, setJobOrders] = useState<JobOrderWithTasks[]>([]);
  const [filteredJobOrders, setFilteredJobOrders] = useState<JobOrderWithTasks[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    async function fetchJobOrders() {
      if (!selectedOrg) {
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      try {
        const result = await loadJobOrders(selectedOrg.id);
        if ("error" in result) {
          setError(result.error);
        } else {
          setJobOrders(result);
          setError(null);
        }
      } catch (err) {
        setError("An unexpected error occurred");
        console.error("Error during fetch:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchJobOrders();
  }, [selectedOrg]);

  useEffect(() => {
    // Filter job orders based on search, date, and status
    let filtered = jobOrders;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(order => 
        order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Date range filter
    if (dateRange?.from && dateRange?.to) {
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.createdAt);
        return isWithinInterval(orderDate, {
          start: dateRange.from!,
          end: endOfDay(dateRange.to!)
        });
      });
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    setFilteredJobOrders(filtered);
  }, [jobOrders, searchQuery, dateRange, statusFilter]);

  const handleDeleteJobOrder = async (jobOrderId: string) => {
    const result = await deleteJobOrder(jobOrderId);
    if (result.success) {
      toast({
        title: "Success",
        description: result.message,
      });
      // Refresh the job order list
      const updatedJobOrders = jobOrders.filter((jo) => jo.id !== jobOrderId);
      setJobOrders(updatedJobOrders);
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
    return <div>{error}</div>;
  }

  return (
    <div className="container mx-auto py-10">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Job Orders</h1>
        <Button asChild>
          <Link href="/job-orders/create">
            <Plus className="mr-2 h-4 w-4" />
            New
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="mb-6 space-y-4">
        <div className="flex gap-4">
          <div className="flex-1 relative max-w-sm">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search order number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
          <DateRangePicker
            date={dateRange}
            onDateChange={setDateRange}
          />
          <Select
            value={statusFilter}
            onValueChange={setStatusFilter}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="todo">Scheduled</SelectItem>
              <SelectItem value="unscheduled">Unscheduled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-4">
        {filteredJobOrders.map((jobOrder) => (
          <Accordion type="single" collapsible key={jobOrder.id}>
            <AccordionItem value={jobOrder.id}>
              <div className="flex items-center justify-between">
                <div className="flex-grow">
                  <h2 className="text-lg font-semibold">Order #{jobOrder.orderNumber}</h2>
                  <p className="text-sm text-gray-500">{jobOrder.address}</p>
                  {jobOrder.schedulesId && (
                    <Link 
                      href={`/schedule/edit/${jobOrder.schedulesId}`}
                      className="text-sm text-blue-500 hover:underline"
                    >
                      View Schedule
                    </Link>
                  )}
                  <span className={`ml-2 text-sm ${
                    jobOrder.status !== 'unscheduled' ? 'text-green-500' : 'text-yellow-500'
                  }`}>
                    • {jobOrder.status === 'todo' ? 'Scheduled' : 'Unscheduled'} 
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <AccordionTrigger>
                  </AccordionTrigger>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem
                        onClick={() => navigator.clipboard.writeText(jobOrder.id)}
                      >
                        Copy job order ID
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href={`/job-orders/edit/${jobOrder.id}`}>
                          Edit job order
                        </Link>
                      </DropdownMenuItem>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                            Delete job order
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Are you absolutely sure?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently
                              delete the job order and all related data.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteJobOrder(jobOrder.id)}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              <AccordionContent>
                <div className="mt-2 space-y-2">
                  <h3 className="font-medium">Tasks:</h3>
                  <ul className="list-disc list-inside">
                    {jobOrder.JobOrderTask.map((jobOrderTask) => (
                      <li key={jobOrderTask.id}>
                        {jobOrderTask.task.task} - Quantity: {jobOrderTask.quantity}
                        <span className="text-sm text-gray-500 ml-2">
                          ({jobOrderTask.task.requiredTimeValue.toString()} {jobOrderTask.task.requiredTimeUnit})
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        ))}
      </div>
    </div>
  );
}

