"use client";

import { useEffect, useState } from "react";
import { Calendar, Plus, Search, Clock, ChevronRight } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { DateRangePicker } from "@/components/DateRangePicker";
import { DateRange } from "react-day-picker";
import { isWithinInterval, endOfDay } from "date-fns";
import { CreateMessage } from "../updates/action";
import { validateRole } from "@/roleAuth";
import { Roles } from "@prisma/client";
import { useSession } from "../SessionProvider";

export default function SchedulesPage() {
  const { user } = useSession();
  const { selectedOrg } = useOrganization();
  const [schedules, setSchedules] = useState<Schedules[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [filteredSchedules, setFilteredSchedules] = useState<Schedules[]>([]);
  const [userRole, setUserRole] = useState<Roles | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

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

  useEffect(() => {
    let filtered = schedules;

    if (searchQuery) {
      filtered = filtered.filter(schedule => 
        schedule.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (dateRange?.from && dateRange?.to) {
      filtered = filtered.filter(schedule => {
        const scheduleDate = new Date(schedule.createdAt);
        return isWithinInterval(scheduleDate, {
          start: dateRange.from!,
          end: endOfDay(dateRange.to!)
        });
      });
    }

    setFilteredSchedules(filtered);
  }, [schedules, searchQuery, dateRange]);

  useEffect(() => {
    async function fetchUserRole() {
      if (!selectedOrg) return;

      const role = await validateRole(user, selectedOrg.id);
      setUserRole(role);
    }

    fetchUserRole();
  }, [selectedOrg, user]);

  const handleDeleteSchedule = async (scheduleId: string, scheduleName: string) => {
    const result = await deleteSchedule(scheduleId);
    if (result.success) {
      toast({
        title: "Success",
        description: result.message,
      });
      const messageResult = await CreateMessage(`deleted Schedule: ${scheduleName}`, selectedOrg!)
          if (messageResult && messageResult.error) {
            toast({
              title: "Error",
              description: `Error creating update message`,
              variant: "destructive",
            });
          }
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
    return (
      <div className="flex h-full w-full items-center justify-center p-8">
        <div className="animate-pulse-opacity text-theme-blue-500 dark:text-theme-blue-400">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <Calendar className="h-16 w-16 animate-float" />
              <div className="absolute -right-2 -top-2 h-4 w-4 animate-pulse rounded-full bg-theme-blue-500"></div>
            </div>
            <p className="text-lg font-medium">Loading Schedules...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!selectedOrg)
    return (
      <div className="flex h-full w-full flex-col items-center justify-center p-8 text-center">
        <div className="glass-card max-w-md p-8">
          <div className="mb-6 text-theme-blue-500 dark:text-theme-blue-400">
            <Calendar className="mx-auto h-16 w-16" />
          </div>
          <h1 className="mb-4 text-2xl font-bold text-gradient">Organization Required</h1>
          <p className="mb-6 text-muted-foreground">Please select or create an organization to view and manage schedules.</p>
        </div>
      </div>
    );

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
            <Calendar className="h-6 w-6 text-theme-blue-600 dark:text-theme-blue-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gradient">Schedules</h1>
            <p className="text-sm text-muted-foreground">Manage your team&apos;s schedules and timelines</p>
          </div>
        </div>
        
        {userRole === "owner" || userRole === "admin" ? (
          <Button asChild className="btn-primary">
            <Link href="/schedule/create">
              <Plus className="mr-2 h-4 w-4" />
              Create Schedule
            </Link>
          </Button>
        ) : null}
      </div>

      <div className="mb-8 rounded-xl bg-white/80 p-6 shadow-soft backdrop-blur-sm dark:bg-gray-800/60">
        <div className="flex flex-col gap-4 md:flex-row md:items-end">
          <div className="flex-1 space-y-2">
            <label htmlFor="search" className="text-sm font-medium text-muted-foreground">
              Search Schedules
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Search by schedule name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 input-field"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Date Range
            </label>
            <DateRangePicker
              date={dateRange}
              onDateChange={setDateRange}
              className="shadow-soft"
            />
          </div>
          
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

      {filteredSchedules.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-xl bg-white/80 p-8 text-center shadow-soft backdrop-blur-sm dark:bg-gray-800/60">
          <div className="mb-4 rounded-full bg-theme-blue-100/50 p-4 dark:bg-theme-blue-900/20">
            <Calendar className="h-8 w-8 text-theme-blue-500 dark:text-theme-blue-400" />
          </div>
          <h3 className="mb-2 text-xl font-semibold">No schedules found</h3>
          <p className="mb-6 max-w-md text-muted-foreground">
            {searchQuery || dateRange ? 
              "Try adjusting your search or date filters to find what you're looking for." : 
              "Create your first schedule to get started with planning and organization."}
          </p>
          {(userRole === "owner" || userRole === "admin") && !searchQuery && !dateRange && (
            <Button asChild className="btn-primary">
              <Link href="/schedule/create">
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Schedule
              </Link>
            </Button>
          )}
        </div>
      ) : viewMode === 'table' ? (
        <div className="rounded-xl bg-white/80 shadow-soft backdrop-blur-sm dark:bg-gray-800/60 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-theme-blue-50/50 dark:bg-theme-blue-900/20">
                <TableHead className="font-medium">Name</TableHead>
                <TableHead className="font-medium">Date</TableHead>
                <TableHead className="text-right font-medium">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSchedules.map((schedule, index) => (
                <TableRow 
                  key={schedule.id}
                  className="animate-fade-in border-b border-theme-blue-100/30 dark:border-theme-blue-900/20"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-theme-blue-100/50 dark:bg-theme-blue-900/30">
                        <Clock className="h-4 w-4 text-theme-blue-600 dark:text-theme-blue-400" />
                      </div>
                      <span>{schedule.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{new Date(schedule.createdAt).toLocaleDateString(undefined, { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                      })}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-theme-blue-100/50 dark:hover:bg-theme-blue-900/30">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56 glass-effect">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem
                          onClick={() => navigator.clipboard.writeText(schedule.id)}
                          className="flex cursor-pointer items-center gap-2"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                          </svg>
                          Copy schedule ID
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {userRole === "owner" || userRole === "admin" ? (
                          <DropdownMenuItem asChild>
                            <Link href={`/schedule/edit/${schedule.id}`} className="flex cursor-pointer items-center gap-2">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Edit schedule
                            </Link>
                          </DropdownMenuItem>
                        ) : null}
                        <DropdownMenuItem asChild>
                          <Link href={`/schedule/edit/${schedule.id}`} className="flex cursor-pointer items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            View schedule
                          </Link>
                        </DropdownMenuItem>
                        {userRole === "owner" || userRole === "admin" ? (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem 
                                onSelect={(e) => e.preventDefault()}
                                className="text-red-600 dark:text-red-400 flex items-center gap-2"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Delete schedule
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="glass-effect">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="text-xl">
                                  Are you absolutely sure?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will permanently
                                  delete the schedule and all related data.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="btn-secondary">Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteSchedule(schedule.id, schedule.name)}
                                  className="bg-red-600 hover:bg-red-700 text-white"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        ) : null}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredSchedules.map((schedule, index) => (
            <div 
              key={schedule.id} 
              className="animate-fade-in glass-card card-hover-effect overflow-hidden"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-theme-blue-100 dark:bg-theme-blue-900/30">
                    <Calendar className="h-5 w-5 text-theme-blue-600 dark:text-theme-blue-400" />
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
                        onClick={() => navigator.clipboard.writeText(schedule.id)}
                        className="flex cursor-pointer items-center gap-2"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                        </svg>
                        Copy schedule ID
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {userRole === "owner" || userRole === "admin" ? (
                        <DropdownMenuItem asChild>
                          <Link href={`/schedule/edit/${schedule.id}`} className="flex cursor-pointer items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Edit schedule
                          </Link>
                        </DropdownMenuItem>
                      ) : null}
                      <DropdownMenuItem asChild>
                        <Link href={`/schedule/edit/${schedule.id}`} className="flex cursor-pointer items-center gap-2">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          View schedule
                        </Link>
                      </DropdownMenuItem>
                      {userRole === "owner" || userRole === "admin" ? (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem 
                              onSelect={(e) => e.preventDefault()}
                              className="text-red-600 dark:text-red-400 flex items-center gap-2"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Delete schedule
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="glass-effect">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-xl">
                                Are you absolutely sure?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will permanently
                                delete the schedule and all related data.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="btn-secondary">Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteSchedule(schedule.id, schedule.name)}
                                className="bg-red-600 hover:bg-red-700 text-white"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      ) : null}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <h3 className="mb-2 text-xl font-semibold">{schedule.name}</h3>
                <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Created on {new Date(schedule.createdAt).toLocaleDateString(undefined, { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric' 
                  })}</span>
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-theme-blue-100/30 dark:border-theme-blue-900/20 bg-theme-blue-50/50 dark:bg-theme-blue-900/10 p-4">
                <Link 
                  href={`/schedule/edit/${schedule.id}`}
                  className="text-sm font-medium text-theme-blue-600 dark:text-theme-blue-400 hover:text-theme-blue-700 dark:hover:text-theme-blue-300 transition-colors flex items-center gap-1"
                >
                  View Details
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

