"use client";

import { useEffect, useState } from "react";
import { JobOrders, JobOrderTask, Tasks } from "@prisma/client";
import { loadJobOrders } from "./loadJobOrders";
import { useOrganization } from "@/app/contexts/OrganizationContext";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus, MoreHorizontal, Search, Package, ChevronRight, MapPin, Calendar } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { DateRangePicker } from "@/components/DateRangePicker";
import { isWithinInterval, endOfDay, format } from "date-fns";
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
} from "@/components/ui/select";
import { CreateMessage } from "../updates/action";

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

  // Add viewMode state
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('grid')

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

  const handleDeleteJobOrder = async (jobOrderId: string, orderNumber: string) => {
    const result = await deleteJobOrder(jobOrderId);
    if (result.success) {
      toast({
        title: "Success",
        description: result.message,
      });
      const messageResult = await CreateMessage(`deleted Job Order: #${orderNumber}`, selectedOrg!)
          if (messageResult && messageResult.error) {
            toast({
              title: "Error",
              description: `Error creating update message`,
              variant: "destructive",
            });
          }
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
    return (
      <div className="flex h-full w-full items-center justify-center p-8">
        <div className="animate-pulse-opacity text-theme-blue-500 dark:text-theme-blue-400">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <Package className="h-16 w-16 animate-float" />
              <div className="absolute -right-2 -top-2 h-4 w-4 animate-pulse rounded-full bg-theme-blue-500"></div>
            </div>
            <p className="text-lg font-medium">Loading Job Orders...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!selectedOrg) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center p-8 text-center">
        <div className="glass-card max-w-md p-8">
          <div className="mb-6 text-theme-blue-500 dark:text-theme-blue-400">
            <Package className="mx-auto h-16 w-16" />
          </div>
          <h1 className="mb-4 text-2xl font-bold text-gradient">Organization Required</h1>
          <p className="mb-6 text-muted-foreground">Please select or create an organization to view and manage job orders.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center p-8 text-center">
        <div className="glass-card max-w-md p-8">
          <div className="mb-6 text-red-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="mb-4 text-2xl font-bold">Something went wrong</h1>
          <p className="mb-6 text-muted-foreground">{error}</p>
          <Button onClick={() => window.location.reload()} className="w-full">Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-theme-blue-100 p-3 dark:bg-theme-blue-900/30">
            <Package className="h-6 w-6 text-theme-blue-600 dark:text-theme-blue-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gradient">Job Orders</h1>
            <p className="text-sm text-muted-foreground">Manage your job orders and their tasks</p>
          </div>
        </div>
        <Button asChild className="btn-primary">
          <Link href="/job-orders/create">
            <Plus className="mr-2 h-4 w-4" />
            New Job Order
          </Link>
        </Button>
      </div>

      <div className="mb-8 rounded-xl bg-white/80 p-6 shadow-soft backdrop-blur-sm dark:bg-gray-800/60">
        <div className="flex flex-col gap-4 md:flex-row md:items-end">
          <div className="flex-1 space-y-2">
            <label htmlFor="search" className="text-sm font-medium text-muted-foreground">
              Search Orders
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Search by order number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 input-field"
              />
            </div>
          </div>
          <DateRangePicker date={dateRange} onDateChange={setDateRange} />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="todo">Scheduled</SelectItem>
              <SelectItem value="unscheduled">Unscheduled</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'table' ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode('table')}
              className="h-10 w-10"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </Button>
            <Button
              variant={viewMode === 'grid' ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode('grid')}
              className="h-10 w-10"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </Button>
          </div>
        </div>
      </div>

      {filteredJobOrders.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-xl bg-white/80 p-8 text-center shadow-soft backdrop-blur-sm dark:bg-gray-800/60">
          <div className="mb-4 rounded-full bg-theme-blue-100/50 p-4 dark:bg-theme-blue-900/20">
            <Package className="h-8 w-8 text-theme-blue-500 dark:text-theme-blue-400" />
          </div>
          <h3 className="mb-2 text-xl font-semibold">No job orders found</h3>
          <p className="mb-6 max-w-md text-muted-foreground">
            {searchQuery || dateRange || statusFilter !== 'all' ? 
              "Try adjusting your filters to find what you're looking for." : 
              "Create your first job order to get started."}
          </p>
          {!searchQuery && statusFilter === 'all' && !dateRange && (
            <Button asChild className="btn-primary">
              <Link href="/job-orders/create">
                <Plus className="mr-2 h-4 w-4" />
                Create First Job Order
              </Link>
            </Button>
          )}
        </div>
      ) : viewMode === 'table' ? (
        <div className="grid grid-cols-1 gap-6">
          {filteredJobOrders.map((jobOrder, index) => (
            <div 
              key={jobOrder.id}
              className="animate-fade-in glass-card card-hover-effect overflow-hidden flex flex-col"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="p-5 flex-grow">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-theme-blue-100 dark:bg-theme-blue-900/30">
                      <Package className="h-5 w-5 text-theme-blue-600 dark:text-theme-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold">Order #{jobOrder.orderNumber}</h3>
                      <span className={`text-sm ${
                        jobOrder.status === 'unscheduled' ? 'text-red-500' :
                        jobOrder.status === 'inprogress' ? 'text-yellow-500' :
                        jobOrder.status === 'todo' ? 'text-blue-500' :
                        jobOrder.status === 'completed' ? 'text-green-500' :
                        'text-muted-foreground'
                      }`}>
                        {jobOrder.status}
                      </span>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-theme-blue-100/50 dark:hover:bg-theme-blue-900/30">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 glass-effect">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem
                        onClick={() => navigator.clipboard.writeText(jobOrder.id)}
                        className="flex cursor-pointer items-center gap-2"
                      >
                        Copy order ID
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href={`/job-orders/edit/${jobOrder.id}`}>Edit order</Link>
                      </DropdownMenuItem>
                      {jobOrder.schedulesId && (
                        <DropdownMenuItem asChild>
                          <Link href={`/schedule/edit/${jobOrder.schedulesId}`}>View Schedule</Link>
                        </DropdownMenuItem>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem 
                            onSelect={(e) => e.preventDefault()}
                            className="text-red-600 dark:text-red-400"
                          >
                            Delete order
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="glass-effect">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-xl">Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete the job order and all related data.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="btn-secondary">Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteJobOrder(jobOrder.id, jobOrder.orderNumber)}
                              className="bg-red-600 hover:bg-red-700 text-white"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span>{jobOrder.address}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>Created on {format(new Date(jobOrder.createdAt), 'MMM d, yyyy')}</span>
                  </div>
                </div>

                <div className="mt-4 border-t border-theme-blue-100/30 dark:border-theme-blue-900/20 pt-4">
                  <h4 className="font-medium mb-2">Tasks:</h4>
                  <ul className="space-y-1">
                    {jobOrder.JobOrderTask.map((jobOrderTask) => (
                      <li key={jobOrderTask.id} className="flex items-center gap-2 text-sm">
                        <div className="h-1.5 w-1.5 rounded-full bg-theme-blue-500"></div>
                        <span>{jobOrderTask.task.task}</span>
                        <span className="text-muted-foreground">
                          (Qty: {jobOrderTask.quantity})
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              
              <div className="mt-auto border-t border-theme-blue-100/30 dark:border-theme-blue-900/20 bg-theme-blue-50/50 dark:bg-theme-blue-900/10">
                <Link 
                  href={`/job-orders/edit/${jobOrder.id}`}
                  className="flex items-center justify-between p-4 text-sm font-medium text-theme-blue-600 dark:text-theme-blue-400 hover:text-theme-blue-700 dark:hover:text-theme-blue-300 transition-colors"
                >
                  <span>Manage Order</span>
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredJobOrders.map((jobOrder, index) => (
            <div 
              key={jobOrder.id}
              className="animate-fade-in glass-card card-hover-effect overflow-hidden flex flex-col"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="p-5 flex-grow">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-theme-blue-100 dark:bg-theme-blue-900/30">
                      <Package className="h-5 w-5 text-theme-blue-600 dark:text-theme-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold">Order #{jobOrder.orderNumber}</h3>
                      <span className={`text-sm ${
                        jobOrder.status === 'unscheduled' ? 'text-red-500' :
                        jobOrder.status === 'inprogress' ? 'text-yellow-500' :
                        jobOrder.status === 'todo' ? 'text-blue-500' :
                        jobOrder.status === 'completed' ? 'text-green-500' :
                        'text-muted-foreground'
                      }`}>
                        {jobOrder.status}
                      </span>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-theme-blue-100/50 dark:hover:bg-theme-blue-900/30">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 glass-effect">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem
                        onClick={() => navigator.clipboard.writeText(jobOrder.id)}
                        className="flex cursor-pointer items-center gap-2"
                      >
                        Copy order ID
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href={`/job-orders/edit/${jobOrder.id}`}>Edit order</Link>
                      </DropdownMenuItem>
                      {jobOrder.schedulesId && (
                        <DropdownMenuItem asChild>
                          <Link href={`/schedule/edit/${jobOrder.schedulesId}`}>View Schedule</Link>
                        </DropdownMenuItem>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem 
                            onSelect={(e) => e.preventDefault()}
                            className="text-red-600 dark:text-red-400"
                          >
                            Delete order
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="glass-effect">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-xl">Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete the job order and all related data.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="btn-secondary">Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteJobOrder(jobOrder.id, jobOrder.orderNumber)}
                              className="bg-red-600 hover:bg-red-700 text-white"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span>{jobOrder.address}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>Created on {format(new Date(jobOrder.createdAt), 'MMM d, yyyy')}</span>
                  </div>
                </div>

                <div className="mt-4 border-t border-theme-blue-100/30 dark:border-theme-blue-900/20 pt-4">
                  <h4 className="font-medium mb-2">Tasks:</h4>
                  <ul className="space-y-1">
                    {jobOrder.JobOrderTask.map((jobOrderTask) => (
                      <li key={jobOrderTask.id} className="flex items-center gap-2 text-sm">
                        <div className="h-1.5 w-1.5 rounded-full bg-theme-blue-500"></div>
                        <span>{jobOrderTask.task.task}</span>
                        <span className="text-muted-foreground">
                          (Qty: {jobOrderTask.quantity})
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              
              <div className="mt-auto border-t border-theme-blue-100/30 dark:border-theme-blue-900/20 bg-theme-blue-50/50 dark:bg-theme-blue-900/10">
                <Link 
                  href={`/job-orders/edit/${jobOrder.id}`}
                  className="flex items-center justify-between p-4 text-sm font-medium text-theme-blue-600 dark:text-theme-blue-400 hover:text-theme-blue-700 dark:hover:text-theme-blue-300 transition-colors"
                >
                  <span>Manage Order</span>
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

