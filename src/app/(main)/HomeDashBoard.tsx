"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import Image from "next/image";
import {
  BarChart3,
  AlertCircle,
  Calendar,
  ClipboardList,
  Users,
  Package,
  Clock,
  ListTodo,
  Building2,
  Plus,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useEffect, useState } from "react";
import { useOrganization } from "@/app/contexts/OrganizationContext";
import { findEmployeebyUserId, loadSchedules } from "./schedule/loadSchedules";
import createOrg from "@/assets/create-org.jpeg";
import schedule from "@/assets/schedule.jpeg";
import tasks from "@/assets/tasks.jpeg";
import employees from "@/assets/employees.jpeg";
import products from "@/assets/products.jpeg";
import type {
  Roles,
  Schedules,
  EmployeeSchedules,
  Employees,
} from "@prisma/client";
import type { JobOrderWithTasks } from "../types/routing";
import { loadUpdates } from "./updates/loadUpdates";
import { Button } from "@/components/ui/button";
import type { updateMessages } from "@prisma/client";
import { validateRole } from "@/roleAuth";
import { useSession } from "./SessionProvider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScheduleMetrics } from "@/components/dashboard/schedule-metrics";
import { loadEmployees } from "./employees/loadEmployees";
import { loadEmployeeSchedules } from "@/app/(main)/schedule/loadSchedules";

interface ScheduleWithJobs extends Schedules {
  jobOrder: JobOrderWithTasks[];
}

interface EmployeeSchedulesWithRelations extends EmployeeSchedules {
  schedule: ScheduleWithJobs;
}

const quickActions = [
  {
    title: "Organizations",
    href: "/organizations/create",
    image: createOrg,
    icon: Building2,
  },
  { title: "Schedule", href: "/schedule", image: schedule, icon: Calendar },
  { title: "Tasks", href: "/tasks", image: tasks, icon: ListTodo },
  { title: "Employees", href: "/employees", image: employees, icon: Users },
  { title: "Products", href: "/products", image: products, icon: Package },
];

export default function Dashboard() {
  const { selectedOrg } = useOrganization();
  const [schedules, setSchedules] = useState<ScheduleWithJobs[]>([]);
  const [employees, setEmployees] = useState<Employees[]>([]);
  const [employeeSchedules, setEmployeeSchedules] = useState<
    EmployeeSchedulesWithRelations[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updates, setUpdates] = useState<updateMessages[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [userRole, setUserRole] = useState<Roles | null>(null);
  const updatesPerPage = 5;
  const { user } = useSession();
  const [activeTab, setActiveTab] = useState("overview");
  const [employeeId, setEmployeeId] = useState<string | null>(null); // State for employee ID

  useEffect(() => {
    async function fetchData() {
      if (!selectedOrg) return;
      const userRole = await validateRole(user, selectedOrg.id);
      setUserRole(userRole);
      setIsLoading(true);

      try {
        // Load schedules
        const schedulesData = await loadSchedules(selectedOrg.id);
        setSchedules(Array.isArray(schedulesData) ? schedulesData : []);

        // Load employees
        const employeesData = await loadEmployees(selectedOrg.id);
        setEmployees(Array.isArray(employeesData) ? employeesData : []);

        // Load employee schedules
        const employeeSchedulesData = await loadEmployeeSchedules(
          selectedOrg.id,
        );
        setEmployeeSchedules(
          Array.isArray(employeeSchedulesData) ? employeeSchedulesData : [],
        );

        // Get the employee ID for the current user
        const employee = await findEmployeebyUserId(user.id, selectedOrg.id);
        setEmployeeId(employee ? employee.id : null); // Set employee ID
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [selectedOrg, user]);

  useEffect(() => {
    async function fetchUpdates() {
      if (!selectedOrg) return;
      try {
        const data = await loadUpdates(selectedOrg.id);
        setUpdates(
          Array.isArray(data)
            ? data.sort(
                (a, b) =>
                  new Date(b.updatedAt).getTime() -
                  new Date(a.updatedAt).getTime(),
              )
            : [],
        );
      } catch (error) {
        console.error("Failed to fetch updates:", error);
      }
    }

    fetchUpdates();
  }, [selectedOrg]);

  const calculateProgress = (schedule: ScheduleWithJobs) => {
    const total = schedule.jobOrder?.length || 0;
    const completed =
      schedule.jobOrder?.filter((job) => job.status === "completed").length ||
      0;

    // Check if the user is not an admin or owner
    if (userRole !== "admin" && userRole !== "owner") {
      // Filter job orders to only include those assigned to the current user
      const userAssignedJobs =
        schedule.jobOrder?.filter((job) => job.employeeId === employeeId) || [];
      const userTotal = userAssignedJobs.length;
      const userCompleted =
        userAssignedJobs.filter((job) => job.status === "completed").length ||
        0;

      return userTotal ? Math.round((userCompleted / userTotal) * 100) : 0; // Calculate progress for user-specific jobs
    }

    return total ? Math.round((completed / total) * 100) : 0; // Default progress calculation for admins/owners
  };

  const getProgressColor = (progress: number) => {
    return progress === 100
      ? "bg-green-100 dark:bg-green-800/50 border-green-200 dark:border-green-700"
      : "bg-yellow-100 dark:bg-yellow-800/50 border-yellow-200 dark:border-yellow-700";
  };

  if (!selectedOrg) {
    return (
      <div className="app-background flex h-full w-full flex-col items-center justify-center bg-noise p-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="glass-card max-w-md p-8"
        >
          <div className="mb-6 text-theme-blue-500 dark:text-theme-blue-400">
            <ClipboardList className="floating-element mx-auto h-16 w-16" />
          </div>
          <h1 className="text-gradient mb-4 text-2xl font-bold">
            Organization Required
          </h1>
          <p className="mb-6 text-muted-foreground">
            Please select or create an organization first.
          </p>
          <Button asChild className="btn-primary w-full">
            <Link href="/organizations/create">
              <Building2 className="mr-2 h-4 w-4" />
              Create Organization
            </Link>
          </Button>
        </motion.div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="app-background flex h-full w-full items-center justify-center bg-noise p-8">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-theme-blue-500 dark:text-theme-blue-400"
        >
          <div className="flex flex-col items-center gap-4">
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Number.POSITIVE_INFINITY, duration: 1.5 }}
              className="floating-element relative"
            >
              <Calendar className="h-12 w-12" />
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Number.POSITIVE_INFINITY, duration: 1.5 }}
                className="absolute -right-2 -top-2 h-4 w-4 rounded-full bg-theme-blue-500"
              />
            </motion.div>
            <p className="text-lg font-medium">Loading dashboard data...</p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="app-background min-h-screen flex-1 bg-noise p-4 md:p-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-6 flex flex-col gap-2 md:flex-row md:items-center md:justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-theme-blue-100 p-3 dark:bg-theme-blue-900/30">
            <BarChart3 className="h-6 w-6 text-theme-blue-600 dark:text-theme-blue-400" />
          </div>
          <div>
            <h1 className="text-gradient text-3xl font-bold">Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Welcome to your organization overview
            </p>
          </div>
        </div>
      </motion.div>

      <Tabs
        defaultValue="overview"
        value={activeTab}
        onValueChange={setActiveTab}
        className="mb-6"
      >
        <TabsList className="glass-effect mb-4 p-1">
          <TabsTrigger
            value="overview"
            className="data-[state=active]:bg-theme-blue-100 data-[state=active]:text-theme-blue-600 dark:data-[state=active]:bg-theme-blue-900/30 dark:data-[state=active]:text-theme-blue-400"
          >
            <BarChart3 className="mr-2 h-4 w-4" />
            Dashboard Overview
          </TabsTrigger>
          {(userRole === "admin" || userRole === "owner") && (
            <TabsTrigger
              value="actions"
              className="data-[state=active]:bg-theme-blue-100 data-[state=active]:text-theme-blue-600 dark:data-[state=active]:bg-theme-blue-900/30 dark:data-[state=active]:text-theme-blue-400"
            >
              <AlertCircle className="mr-2 h-4 w-4" />
              Quick Actions
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Active Schedules */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="glass-card mt-0 p-6">
              <div className="mb-4">
                <h2 className="flex items-center text-xl font-semibold">
                  <Calendar className="mr-2 h-5 w-5 text-theme-blue-600 dark:text-theme-blue-400" />
                  Active Schedules
                </h2>
              </div>

              {schedules.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="mb-4 rounded-full bg-theme-blue-100/50 p-4 dark:bg-theme-blue-900/20">
                    <Calendar className="floating-element h-8 w-8 text-theme-blue-600 dark:text-theme-blue-400" />
                  </div>
                  <h3 className="mb-2 text-xl font-semibold">
                    No active schedules
                  </h3>
                  <p className="mb-6 max-w-md text-muted-foreground">
                    Create your first schedule to start planning and organizing
                    your team&apos;s work.
                  </p>
                  {(userRole === "owner" || userRole === "admin") && (
                    <Button asChild className="btn-primary">
                      <Link href="/schedule/create">
                        <Plus className="mr-2 h-4 w-4" />
                        Create Your First Schedule
                      </Link>
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  {schedules.map((schedule, index) => {
                    const progress = calculateProgress(schedule);
                    return (
                      <motion.div
                        key={schedule.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                        className="card-hover-effect"
                      >
                        <Link href={`/schedule/edit/${schedule.id}`}>
                          <Card
                            className={`cursor-pointer border-2 ${getProgressColor(progress)} bg-white/90 dark:bg-gray-800/80`}
                          >
                            <CardHeader className="pb-2">
                              <CardTitle className="flex items-center text-lg">
                                <Clock className="mr-2 h-4 w-4 text-theme-blue-600 dark:text-theme-blue-400" />
                                {schedule.name}
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="mb-2 flex justify-between text-sm">
                                <span>Progress</span>
                                <span className="font-medium">{progress}%</span>
                              </div>
                              <Progress
                                value={progress}
                                className="h-2"
                                classNameIndicator={
                                  progress === 100
                                    ? "bg-green-500"
                                    : "bg-theme-blue-500"
                                }
                              />
                              <div className="mt-4 flex justify-between text-sm text-muted-foreground">
                                <span>
                                  Total:{" "}
                                  {userRole !== "admin" && userRole !== "owner"
                                    ? schedule.jobOrder?.filter(
                                        (job) => job.employeeId === employeeId,
                                      ).length || 0
                                    : schedule.jobOrder?.length || 0}
                                </span>
                                <span>
                                  Completed:{" "}
                                  {userRole !== "admin" && userRole !== "owner"
                                    ? schedule.jobOrder?.filter(
                                        (job) =>
                                          job.employeeId === employeeId &&
                                          job.status === "completed",
                                      ).length || 0
                                    : schedule.jobOrder?.filter(
                                        (job) => job.status === "completed",
                                      ).length || 0}
                                </span>
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>

          {/* Performance Metrics Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="mb-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center text-xl font-semibold">
                  <Calendar className="mr-2 h-5 w-5 text-theme-blue-600 dark:text-theme-blue-400" />
                  Schedule & Task Performance
                </h2>
                {(userRole === "owner" || userRole === "admin") && (
                  <Button asChild className="btn-primary">
                    <Link href="/schedule/create">
                      <Plus className="mr-2 h-4 w-4" />
                      Create Schedule
                    </Link>
                  </Button>
                )}
              </div>

              {/* Performance Metrics */}
              <ScheduleMetrics
                employees={employees}
                employeeSchedules={employeeSchedules}
                userRole={userRole!}
                orgId={selectedOrg!.id}
              />
            </div>

            {/* Recent Updates (only for admin/owner) */}
            {(userRole === "admin" || userRole === "owner") && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <Card className="glass-card animate-scale-in">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <AlertCircle className="mr-2 h-5 w-5 text-theme-blue-600 dark:text-theme-blue-400" />
                      Recent Updates
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {updates.length > 0 ? (
                        <>
                          {updates
                            .slice(
                              (currentPage - 1) * updatesPerPage,
                              currentPage * updatesPerPage,
                            )
                            .map((update, index) => (
                              <motion.div
                                key={update.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{
                                  duration: 0.3,
                                  delay: index * 0.1,
                                }}
                                className="animate-slide-in border-b border-theme-blue-100/30 pb-3 last:border-0 dark:border-theme-blue-900/30"
                              >
                                <p className="text-sm">{update.message}</p>
                                <p className="mt-1 flex items-center text-xs text-muted-foreground">
                                  <Clock className="mr-1 h-3 w-3" />
                                  {new Date(
                                    update.updatedAt,
                                  ).toLocaleDateString()}{" "}
                                  at{" "}
                                  {new Date(
                                    update.updatedAt,
                                  ).toLocaleTimeString()}
                                </p>
                              </motion.div>
                            ))}
                          <div className="flex items-center justify-between pt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setCurrentPage((p) => Math.max(1, p - 1))
                              }
                              disabled={currentPage === 1}
                              className="btn-secondary"
                            >
                              Previous
                            </Button>
                            <span className="text-sm">
                              Page {currentPage} of{" "}
                              {Math.ceil(updates.length / updatesPerPage)}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setCurrentPage((p) =>
                                  Math.min(
                                    Math.ceil(updates.length / updatesPerPage),
                                    p + 1,
                                  ),
                                )
                              }
                              disabled={
                                currentPage >=
                                Math.ceil(updates.length / updatesPerPage)
                              }
                              className="btn-secondary"
                            >
                              Next
                            </Button>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-6 text-center">
                          <div className="mb-3 rounded-full bg-theme-blue-100/50 p-3 dark:bg-theme-blue-900/20">
                            <AlertCircle className="h-6 w-6 text-theme-blue-600 dark:text-theme-blue-400" />
                          </div>
                          <p className="text-muted-foreground">
                            No recent updates
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </motion.div>
        </TabsContent>

        <TabsContent value="actions">
          {/* Quick Access Links */}
          {(userRole === "admin" || userRole === "owner") && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="grid grid-cols-1 gap-6 md:grid-cols-2"
            >
              <Card className="glass-card animate-scale-in">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BarChart3 className="mr-2 h-5 w-5 text-theme-blue-600 dark:text-theme-blue-400" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {quickActions.map((action, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                        className="card-hover-effect overflow-hidden rounded-lg"
                      >
                        <Link
                          href={action.href}
                          className="group relative block h-32 overflow-hidden rounded-lg"
                        >
                          <Image
                            src={action.image || "/placeholder.svg"}
                            alt={action.title}
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-110"
                            sizes="(max-width: 768px) 100vw, 50vw"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-theme-blue-900/80 to-theme-blue-900/30 p-4">
                            <div className="text-center">
                              <action.icon className="mx-auto mb-2 h-8 w-8 text-white" />
                              <span className="text-lg font-semibold text-white">
                                {action.title}
                              </span>
                            </div>
                          </div>
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card animate-scale-in">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <AlertCircle className="mr-2 h-5 w-5 text-theme-blue-600 dark:text-theme-blue-400" />
                    Recent Updates
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {updates.length > 0 ? (
                      <>
                        {updates
                          .slice(
                            (currentPage - 1) * updatesPerPage,
                            currentPage * updatesPerPage,
                          )
                          .map((update, index) => (
                            <motion.div
                              key={update.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.3, delay: index * 0.1 }}
                              className="animate-slide-in border-b border-theme-blue-100/30 pb-3 last:border-0 dark:border-theme-blue-900/30"
                            >
                              <p className="text-sm">{update.message}</p>
                              <p className="mt-1 flex items-center text-xs text-muted-foreground">
                                <Clock className="mr-1 h-3 w-3" />
                                {new Date(
                                  update.updatedAt,
                                ).toLocaleDateString()}{" "}
                                at{" "}
                                {new Date(
                                  update.updatedAt,
                                ).toLocaleTimeString()}
                              </p>
                            </motion.div>
                          ))}
                        <div className="flex items-center justify-between pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setCurrentPage((p) => Math.max(1, p - 1))
                            }
                            disabled={currentPage === 1}
                            className="btn-secondary"
                          >
                            Previous
                          </Button>
                          <span className="text-sm">
                            Page {currentPage} of{" "}
                            {Math.ceil(updates.length / updatesPerPage)}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setCurrentPage((p) =>
                                Math.min(
                                  Math.ceil(updates.length / updatesPerPage),
                                  p + 1,
                                ),
                              )
                            }
                            disabled={
                              currentPage >=
                              Math.ceil(updates.length / updatesPerPage)
                            }
                            className="btn-secondary"
                          >
                            Next
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-6 text-center">
                        <div className="mb-3 rounded-full bg-theme-blue-100/50 p-3 dark:bg-theme-blue-900/20">
                          <AlertCircle className="h-6 w-6 text-theme-blue-600 dark:text-theme-blue-400" />
                        </div>
                        <p className="text-muted-foreground">
                          No recent updates
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
