"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Users,
  Package,
  Route,
  Car,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart } from "@/components/ui/chart";
import type { Employees, Roles, EmployeeSchedules, Schedules } from "@prisma/client";
import type { JobOrderWithTasks } from "@/app/types/routing";
import { subDays, startOfMonth, endOfMonth } from "date-fns";
import { useSession } from "@/app/(main)/SessionProvider";
import { findEmployeebyUserId } from "@/app/(main)/schedule/loadSchedules";

interface ScheduleWithJobs extends Schedules {
  jobOrder: JobOrderWithTasks[];
}

interface EmployeeSchedulesWithRelations extends EmployeeSchedules {
  schedule: ScheduleWithJobs;
}

interface ScheduleMetricsProps {
  employees: Employees[];
  employeeSchedules: EmployeeSchedulesWithRelations[];
  userRole: Roles;
  orgId: string;
}

export function ScheduleMetrics({
  employees,
  employeeSchedules,
  userRole,
  orgId,
}: ScheduleMetricsProps) {
  const [timeFilter, setTimeFilter] = useState<
    "all" | "7days" | "30days" | "thisMonth"
  >("all");
  const [metricView, setMetricView] = useState<"distance" | "orders" | "tasks">("distance");
  const [filteredSchedules, setFilteredSchedules] = useState(employeeSchedules);
  const user = useSession();
  const [currentEmployee, setCurrentEmployee] = useState<Employees | null>(null);

  useEffect(() => {
    async function getCurrentEmployee() {
      if (user.user && !["admin", "owner"].includes(userRole)) {
        const response = await findEmployeebyUserId(user.user.id, orgId);
        setCurrentEmployee(response);
      }
    }
    getCurrentEmployee();
  }, [user, userRole]);

  useEffect(() => {
    async function filterSchedules() {
      // First filter by employee if user is not admin/owner
      let schedulesToFilter = employeeSchedules;
      
      if (!["admin", "owner"].includes(userRole) && currentEmployee) {
        schedulesToFilter = employeeSchedules.filter(
          (schedule) => {
            // Check if any job orders belong to this employee
            return schedule.schedule.jobOrder.some(
              order => order.employeeId === currentEmployee.id
            );
          }
        );
      }

      // Then apply time filter
      if (timeFilter === "all") {
        setFilteredSchedules(schedulesToFilter);
        return;
      }

      const now = new Date();
      const filtered = schedulesToFilter.filter(schedule => {
        const scheduleDate = new Date(schedule.schedule.departTime);

        switch (timeFilter) {
          case "7days": {
            const sevenDaysAgo = subDays(now, 7);
            return scheduleDate >= sevenDaysAgo;
          }
          case "30days": {
            const thirtyDaysAgo = subDays(now, 30);
            return scheduleDate >= thirtyDaysAgo;
          }
          case "thisMonth": {
            const startMonth = startOfMonth(now);
            const endMonth = endOfMonth(now);
            return scheduleDate >= startMonth && scheduleDate <= endMonth;
          }
          default:
            return true;
        }
      });

      setFilteredSchedules(filtered);
    }

    filterSchedules();
  }, [timeFilter, employeeSchedules, currentEmployee, userRole]);

  

  // function to calculate tasks for a job order
  function calculateOrderTasks(order: JobOrderWithTasks) {
    return order.JobOrderTask.reduce((sum, task) => sum + (task.quantity || 0), 0);
  }

  const processedOrderIds = new Set();
  const taskCalculations = filteredSchedules.reduce((acc, schedule) => {
    schedule.schedule.jobOrder.forEach(order => {
      // Only process each scheduled order once and check if it belongs to the current employee
      if (!processedOrderIds.has(order.id) && order.schedulesId && 
          (!currentEmployee || ["admin", "owner"].includes(userRole) || order.employeeId === currentEmployee.id)) {
        processedOrderIds.add(order.id);
        
        const orderTaskCount = calculateOrderTasks(order);
        acc.totalTasks += orderTaskCount;
        acc.totalOrders += 1;
        
        if (order.status === "completed") {
          acc.completedTasks += orderTaskCount;
          acc.completedOrders += 1;
        } else if (order.status === "inprogress") {
          acc.inProgressTasks += orderTaskCount;
          acc.inProgressOrders += 1;
        } else if (order.status === "todo") {
          acc.todoTasks += orderTaskCount;
          acc.todoOrders += 1;
        }
      }
    });
    
    return acc;
  }, { totalTasks: 0, completedTasks: 0, inProgressTasks: 0, todoTasks: 0, totalOrders: 0, completedOrders: 0, inProgressOrders: 0, todoOrders: 0 });


  // Use the calculated values
  const totalTasks = taskCalculations.totalTasks;
  const taskMetrics = {
    completed: taskCalculations.completedTasks,
    inProgress: taskCalculations.inProgressTasks,
    todo: taskCalculations.todoTasks
  };

  const totalOrders = taskCalculations.totalOrders;
  const orderMetrics = {
    completed: taskCalculations.completedOrders,
    inProgress: taskCalculations.inProgressOrders,
    todo: taskCalculations.todoOrders
  };

  // Calculate employee metrics
  const employeeMetrics = employees.map((employee) => {
    const employeeScheduleData = filteredSchedules.filter(
      (es) => es.employeeId === employee.id,
    );

    const totalDistance = employeeScheduleData.reduce(
      (sum, es) => sum + Number(es.totalDistance),
      0,
    );
    
    const totalOrders = employeeScheduleData.reduce(
      (sum, es) => sum + es.totalOrders,
      0,
    );

    const processedOrderIds = new Set();
    const totalTasks = employeeScheduleData.reduce((sum, es) => {
      return sum + es.schedule.jobOrder.reduce((orderSum, order) => {
        if (!processedOrderIds.has(order.id) && order.employeeId === employee.id && order.schedulesId) {
          processedOrderIds.add(order.id);
          return orderSum + calculateOrderTasks(order);
        }
        return orderSum;
      }, 0);
    }, 0);


    return {
      ...employee,
      totalDistance,
      totalOrders,
      totalTasks
    };
  });

  // Sort employees by different metrics
  const topEmployeesByDistance = [...employeeMetrics]
    .filter((emp) => emp.totalDistance > 0)
    .sort((a, b) => b.totalDistance - a.totalDistance)
    .slice(0, 5);

  const topEmployeesByOrders = [...employeeMetrics]
    .filter((emp) => emp.totalOrders > 0)
    .sort((a, b) => b.totalOrders - a.totalOrders)
    .slice(0, 5);

  const topEmployeesByTasks = [...employeeMetrics]
    .filter((emp) => emp.totalTasks > 0)
    .sort((a, b) => b.totalTasks - a.totalTasks)
    .slice(0, 5);

  // Generate chart data
  const generateChartData = () => {
    if (metricView === "distance") {
      return topEmployeesByDistance.map((emp) => ({
        name: emp.name.length > 15 ? `${emp.name.substring(0, 15)}...` : emp.name,
        distance: Number(emp.totalDistance.toFixed(1)),
      }));
    } else if (metricView === "orders") {
      return topEmployeesByOrders.map((emp) => ({
        name: emp.name.length > 15 ? `${emp.name.substring(0, 15)}...` : emp.name,
        orders: emp.totalOrders,
      }));
    } else {
      return topEmployeesByTasks.map((emp) => ({
        name: emp.name.length > 15 ? `${emp.name.substring(0, 15)}...` : emp.name,
        tasks: emp.totalTasks,
      }));
    }
  };

  const chartData = generateChartData();

  return (
    <div className="space-y-6">
      {/* Filter Controls - Only show time filter for non-admin/owner users */}
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Time Period:</span>
          <Select
            value={timeFilter}
            onValueChange={(value) => setTimeFilter(value as any)}
          >
            <SelectTrigger className="input-field w-[180px]">
              <SelectValue placeholder="Select time period" />
            </SelectTrigger>
            <SelectContent className="glass-effect">
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="7days">Last 7 Days</SelectItem>
              <SelectItem value="30days">Last 30 Days</SelectItem>
              <SelectItem value="thisMonth">This Month</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {["admin", "owner"].includes(userRole) && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">View:</span>
            <Tabs
              value={metricView}
              onValueChange={(value) => setMetricView(value as any)}
              className="w-[300px]"
            >
              <TabsList className="glass-effect">
                <TabsTrigger value="distance" className="flex-1">
                  <Car className="mr-2 h-4 w-4" />
                  Distance
                </TabsTrigger>
                <TabsTrigger value="orders" className="flex-1">
                  <Package className="mr-2 h-4 w-4" />
                  Orders
                </TabsTrigger>
                <TabsTrigger value="tasks" className="flex-1">
                  <Package className="mr-2 h-4 w-4" />
                  Tasks
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="card-hover-effect"
        >
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Total Distance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">
                  {filteredSchedules
                    .reduce((sum, es) => {
                      // Only include distance if it's for all users or matches current employee
                      if (!currentEmployee || ["admin", "owner"].includes(userRole) || es.employeeId === currentEmployee.id) {
                        return sum + Number(es.totalDistance);
                      }
                      return sum;
                    }, 0)
                    .toFixed(1)}{" "}
                  km
                </div>
                <Car className="h-8 w-8 text-theme-blue-500" />
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                {timeFilter === "all"
                  ? "All time"
                  : timeFilter === "7days"
                    ? "Last 7 days"
                    : timeFilter === "30days"
                      ? "Last 30 days"
                      : "This month"}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="card-hover-effect"
        >
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Total Orders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">
                  {totalOrders}
                </div>
                <Package className="h-8 w-8 text-theme-blue-500" />
              </div>
              <div className="mt-2 flex items-center gap-2 text-xs">
                <Badge variant="outline" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                  {orderMetrics.completed} completed
                </Badge>
                <Badge variant="outline" className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300">
                  {orderMetrics.inProgress} in progress
                </Badge>
                <Badge variant="outline" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                  {orderMetrics.todo} todo
                </Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="card-hover-effect"
        >
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">
                  {totalTasks}
                </div>
                <Package className="h-8 w-8 text-theme-blue-500" />
              </div>
              <div className="mt-2 flex items-center gap-2 text-xs">
                <Badge variant="outline" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                  {taskMetrics.completed} completed
                </Badge>
                <Badge variant="outline" className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300">
                  {taskMetrics.inProgress} in progress
                </Badge>
                <Badge variant="outline" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                  {taskMetrics.todo} todo
                </Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Only show Performance Chart and Employee Performance Details for admin/owner */}
      {["admin", "owner"].includes(userRole!) && (
        <div className="grid grid-cols-12 gap-6">
          {/* Top Performing Employees - 1/3 width */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
            className="col-span-12 lg:col-span-4"
          >
            <Card className="glass-card h-full">
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <Route className="mr-2 h-5 w-5 text-theme-blue-500" />
                  {metricView === "distance"
                    ? "Distance Champions"
                    : metricView === "orders"
                      ? "Order Champions"
                      : "Task Champions"}
                </CardTitle>
                <CardDescription>
                  {metricView === "distance"
                    ? "Employees who traveled the most distance"
                    : metricView === "orders"
                      ? "Employees who completed the most orders"
                      : "Employees who completed the most tasks"}
                </CardDescription>
              </CardHeader>
              <CardContent className="max-h-[350px] overflow-y-auto">
                {(metricView === "distance"
                  ? topEmployeesByDistance
                  : metricView === "orders"
                    ? topEmployeesByOrders
                    : topEmployeesByTasks
                ).length > 0 ? (
                  <div className="space-y-4">
                    {(metricView === "distance"
                      ? topEmployeesByDistance
                      : metricView === "orders"
                        ? topEmployeesByOrders
                        : topEmployeesByTasks
                    ).map((employee) => (
                      <div
                        key={employee.id}
                        className="flex items-center justify-between rounded-lg border border-border bg-white/50 p-3 dark:bg-gray-800/50"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback className="bg-theme-blue-100 text-theme-blue-700 dark:bg-theme-blue-900 dark:text-theme-blue-300">
                              {employee.name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{employee.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {employee.area || "No area assigned"}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          {metricView === "distance" ? (
                            <>
                              <p className="text-sm font-medium">
                                {employee.totalDistance.toFixed(1)} km
                              </p>
                            </>
                          ) : metricView === "orders" ? (
                            <>
                              <p className="text-sm font-medium">
                                {employee.totalOrders} Job Orders
                              </p>
                            </>
                          ) : (
                            <>
                              <p className="text-sm font-medium">
                                {employee.totalTasks} Tasks
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Users className="mb-2 h-10 w-10 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      No employee data available for this period
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Performance Chart - 2/3 width */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="col-span-12 lg:col-span-8"
          >
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  {metricView === "distance" ? (
                    <>
                      <Car className="mr-2 h-5 w-5 text-theme-blue-500" />
                      Top Employees by Distance Traveled
                    </>
                  ) : metricView === "orders" ? (
                    <>
                      <Package className="mr-2 h-5 w-5 text-theme-blue-500" />
                      Top Employees by Orders Completed
                    </>
                  ) : (
                    <>
                      <Package className="mr-2 h-5 w-5 text-theme-blue-500" />
                      Top Employees by Tasks Completed
                    </>
                  )}
                </CardTitle>
                <CardDescription>
                  {timeFilter === "all"
                    ? "All time"
                    : timeFilter === "7days"
                      ? "Last 7 days"
                      : timeFilter === "30days"
                        ? "Last 30 days"
                        : "This month"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <BarChart
                    data={chartData}
                    index="name"
                    categories={
                      metricView === "distance"
                        ? ["distance"]
                        : metricView === "orders"
                          ? ["orders"]
                          : ["tasks"]
                    }
                    colors={["#3b82f6"]}
                    valueFormatter={(value) =>
                      metricView === "distance"
                        ? `${value} km`
                        : metricView === "orders"
                          ? `${value} orders`
                          : `${value} tasks`
                    }
                    layout="vertical"
                    className="h-full w-full"
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}
    </div>
  );
}
