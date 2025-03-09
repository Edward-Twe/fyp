"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Users,
  Package,
  Clock,
  Route,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Car,
  Timer,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

interface EmployeeSchedulesWithRelations extends EmployeeSchedules {
  schedule: Schedules;
}

interface ScheduleMetricsProps {
  employees: Employees[];
  jobOrders: JobOrderWithTasks[];
  employeeSchedules: EmployeeSchedulesWithRelations[];
  userRole: Roles | null;
}

export function ScheduleMetrics({
  employees,
  jobOrders,
  employeeSchedules,
  userRole,
}: ScheduleMetricsProps) {
  const [timeFilter, setTimeFilter] = useState<
    "all" | "7days" | "30days" | "thisMonth"
  >("all");
  const [metricView, setMetricView] = useState<"distance" | "orders" | "time">(
    "distance",
  );
  const [filteredSchedules, setFilteredSchedules] = useState(employeeSchedules);

  useEffect(() => {
    console.log("Effect triggered with timeFilter:", timeFilter);
    console.log("Current employeeSchedules:", employeeSchedules);

    async function filterSchedules() {
      if (timeFilter === "all") {
        console.log("Setting all schedules");
        setFilteredSchedules(employeeSchedules);
        return;
      }

      const now = new Date();
      console.log("Filtering schedules for date:", now);

      // Filter using the schedule relation directly
      const filtered = employeeSchedules.filter(schedule => {
        const scheduleDate = new Date(schedule.schedule.departTime);
        console.log("Schedule date:", scheduleDate);

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

      console.log("Filtered schedules:", filtered);
      setFilteredSchedules(filtered);
    }

    filterSchedules();
  }, [timeFilter, employeeSchedules]);

  // Calculate metrics
  const completedOrders = jobOrders.filter(
    (order) => order.status === "completed",
  ).length;
  const inProgressOrders = jobOrders.filter(
    (order) => order.status === "inprogress",
  ).length;

  const unassignedOrders = jobOrders.filter((order) => !order.employeeId);
  const urgentOrders = jobOrders.filter(
    (order) =>
      order.status === "todo" &&
      new Date(order.createdAt).getTime() < Date.now() - 24 * 60 * 60 * 1000, // Older than 24 hours
  );

  // Calculate employee performance metrics
  const employeeMetrics = employees.map((employee) => {
    const employeeScheduleData = filteredSchedules.filter(
      (es) => es.employeeId === employee.id,
    );

    const totalDistance = employeeScheduleData.reduce(
      (sum, es) => sum + Number(es.totalDistance),
      0,
    );
    const totalTime = employeeScheduleData.reduce(
      (sum, es) => sum + Number(es.totalTime),
      0,
    );
    const totalOrdersCompleted = employeeScheduleData.reduce(
      (sum, es) => sum + es.totalOrders,
      0,
    );

    // Calculate efficiency metrics
    const ordersPerHour =
      totalTime > 0 ? totalOrdersCompleted / (totalTime / 60) : 0;
    const distancePerOrder =
      totalOrdersCompleted > 0 ? totalDistance / totalOrdersCompleted : 0;

    const assignedOrders = jobOrders.filter(
      (order) => order.employeeId === employee.id,
    );
    const completedOrdersCount = assignedOrders.filter(
      (order) => order.status === "completed",
    ).length;

    return {
      ...employee,
      totalDistance,
      totalTime,
      totalOrdersCompleted,
      ordersPerHour,
      distancePerOrder,
      assignedOrders: assignedOrders.length,
      completedOrdersCount,
      completionRate:
        assignedOrders.length > 0
          ? Math.round((completedOrdersCount / assignedOrders.length) * 100)
          : 0,
    };
  });

  // Sort employees by different metrics
  const topEmployeesByDistance = [...employeeMetrics]
    .filter((emp) => emp.totalDistance > 0)
    .sort((a, b) => b.totalDistance - a.totalDistance)
    .slice(0, 5);

  const topEmployeesByOrders = [...employeeMetrics]
    .filter((emp) => emp.totalOrdersCompleted > 0)
    .sort((a, b) => b.totalOrdersCompleted - a.totalOrdersCompleted)
    .slice(0, 5);

  const topEmployeesByEfficiency = [...employeeMetrics]
    .filter((emp) => emp.ordersPerHour > 0)
    .sort((a, b) => b.ordersPerHour - a.ordersPerHour)
    .slice(0, 5);

  // Generate chart data
  const generateChartData = () => {
    if (metricView === "distance") {
      return topEmployeesByDistance.map((emp) => ({
        name:
          emp.name.length > 15 ? `${emp.name.substring(0, 15)}...` : emp.name,
        distance: Number(emp.totalDistance.toFixed(1)),
      }));
    } else if (metricView === "orders") {
      return topEmployeesByOrders.map((emp) => ({
        name:
          emp.name.length > 15 ? `${emp.name.substring(0, 15)}...` : emp.name,
        orders: emp.totalOrdersCompleted,
      }));
    } else {
      return topEmployeesByEfficiency.map((emp) => ({
        name:
          emp.name.length > 15 ? `${emp.name.substring(0, 15)}...` : emp.name,
        efficiency: Number(emp.ordersPerHour.toFixed(2)),
      }));
    }
  };

  const chartData = generateChartData();

  return (
    <div className="space-y-6">
      {/* Filter Controls */}
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
              <TabsTrigger value="time" className="flex-1">
                <Timer className="mr-2 h-4 w-4" />
                Efficiency
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
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
                    .reduce((sum, es) => sum + Number(es.totalDistance), 0)
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
                  {filteredSchedules.reduce(
                    (sum, es) => sum + es.totalOrders,
                    0,
                  )}
                </div>
                <Package className="h-8 w-8 text-theme-blue-500" />
              </div>
              <div className="mt-2 flex items-center gap-2 text-xs">
                <Badge
                  variant="outline"
                  className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                >
                  {completedOrders} completed
                </Badge>
                <Badge
                  variant="outline"
                  className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300"
                >
                  {inProgressOrders} in progress
                </Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="card-hover-effect"
        >
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">
                  {Math.round(
                    filteredSchedules.reduce(
                      (sum, es) => sum + Number(es.totalTime),
                      0,
                    ),
                  )}{" "}
                  min
                </div>
                <Clock className="h-8 w-8 text-theme-blue-500" />
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                {(
                  filteredSchedules.reduce(
                    (sum, es) => sum + Number(es.totalTime),
                    0,
                  ) / 60
                ).toFixed(1)}{" "}
                hours
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
              <CardTitle className="text-sm font-medium">
                Needs Attention
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">
                  {unassignedOrders.length + urgentOrders.length}
                </div>
                <AlertTriangle className="h-8 w-8 text-amber-500" />
              </div>
              <div className="mt-2 flex items-center gap-2 text-xs">
                {unassignedOrders.length > 0 && (
                  <Badge
                    variant="outline"
                    className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                  >
                    {unassignedOrders.length} unassigned
                  </Badge>
                )}
                {urgentOrders.length > 0 && (
                  <Badge
                    variant="outline"
                    className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                  >
                    {urgentOrders.length} urgent
                  </Badge>
                )}
                {unassignedOrders.length === 0 && urgentOrders.length === 0 && (
                  <span className="text-green-600 dark:text-green-400">
                    All orders on track
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Performance Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
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
                  <TrendingUp className="mr-2 h-5 w-5 text-theme-blue-500" />
                  Top Employees by Efficiency (Orders/Hour)
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
                      : ["efficiency"]
                }
                colors={["#3b82f6"]}
                valueFormatter={(value) =>
                  metricView === "distance"
                    ? `${value} km`
                    : metricView === "orders"
                      ? `${value} orders`
                      : `${value} orders/hr`
                }
                layout="vertical"
                className="h-full w-full"
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Employee Performance Details */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top Performing Employees */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="glass-card h-full">
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <Route className="mr-2 h-5 w-5 text-theme-blue-500" />
                {metricView === "distance"
                  ? "Distance Champions"
                  : metricView === "orders"
                    ? "Order Champions"
                    : "Efficiency Champions"}
              </CardTitle>
              <CardDescription>
                {metricView === "distance"
                  ? "Employees who traveled the most distance"
                  : metricView === "orders"
                    ? "Employees who completed the most orders"
                    : "Employees with highest orders per hour"}
              </CardDescription>
            </CardHeader>
            <CardContent className="max-h-[350px] overflow-y-auto">
              {(metricView === "distance"
                ? topEmployeesByDistance
                : metricView === "orders"
                  ? topEmployeesByOrders
                  : topEmployeesByEfficiency
              ).length > 0 ? (
                <div className="space-y-4">
                  {(metricView === "distance"
                    ? topEmployeesByDistance
                    : metricView === "orders"
                      ? topEmployeesByOrders
                      : topEmployeesByEfficiency
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
                              {employee.totalDistance.toFixed(1)} km traveled
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {employee.distancePerOrder.toFixed(1)} km per
                              order
                            </p>
                          </>
                        ) : metricView === "orders" ? (
                          <>
                            <p className="text-sm font-medium">
                              {employee.totalOrdersCompleted} orders completed
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {employee.completionRate}% completion rate
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="text-sm font-medium">
                              {employee.ordersPerHour.toFixed(2)} orders/hour
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {employee.totalTime > 0
                                ? (employee.totalTime / 60).toFixed(1)
                                : 0}{" "}
                              hours worked
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

        {/* Orders Needing Attention */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="glass-card h-full">
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <AlertTriangle className="mr-2 h-5 w-5 text-amber-500" />
                Orders Needing Attention
              </CardTitle>
              <CardDescription>Unassigned and urgent orders</CardDescription>
            </CardHeader>
            <CardContent className="max-h-[350px] overflow-y-auto">
              {unassignedOrders.length > 0 || urgentOrders.length > 0 ? (
                <div className="space-y-4">
                  {/* Unassigned Orders */}
                  {unassignedOrders.length > 0 && (
                    <div>
                      <h3 className="mb-2 flex items-center text-sm font-medium">
                        <Package className="mr-2 h-4 w-4 text-amber-500" />
                        Unassigned Orders
                      </h3>
                      <div className="space-y-2">
                        {unassignedOrders.slice(0, 3).map((order) => (
                          <div
                            key={order.id}
                            className="rounded-lg border border-border bg-white/50 p-3 dark:bg-gray-800/50"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium">
                                  Order #{order.orderNumber}
                                </p>
                                <p className="max-w-[200px] truncate text-xs text-muted-foreground">
                                  {order.address}
                                </p>
                              </div>
                              <Badge
                                variant="outline"
                                className="bg-theme-blue-100 text-theme-blue-700 dark:bg-theme-blue-900/30 dark:text-theme-blue-300"
                              >
                                Space: {order.spaceRequried.toString()}
                              </Badge>
                            </div>
                          </div>
                        ))}
                        {unassignedOrders.length > 3 && (
                          <Button
                            variant="ghost"
                            className="w-full text-theme-blue-500 hover:bg-theme-blue-50 hover:text-theme-blue-600 dark:hover:bg-theme-blue-900/20"
                            asChild
                          >
                            <Link href="/schedule">
                              View all {unassignedOrders.length} unassigned
                              orders
                              <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Urgent Orders */}
                  {urgentOrders.length > 0 && (
                    <div>
                      <h3 className="mb-2 flex items-center text-sm font-medium">
                        <AlertTriangle className="mr-2 h-4 w-4 text-red-500" />
                        Urgent Orders
                      </h3>
                      <div className="space-y-2">
                        {urgentOrders.slice(0, 3).map((order) => (
                          <div
                            key={order.id}
                            className="rounded-lg border border-red-200 bg-red-50/50 p-3 dark:border-red-900/30 dark:bg-red-900/10"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium">
                                  Order #{order.orderNumber}
                                </p>
                                <p className="max-w-[200px] truncate text-xs text-muted-foreground">
                                  {order.address}
                                </p>
                              </div>
                              <div>
                                {order.employeeId ? (
                                  <p className="text-xs font-medium">
                                    Assigned to:{" "}
                                    {employees.find(
                                      (e) => e.id === order.employeeId,
                                    )?.name || "Unknown"}
                                  </p>
                                ) : (
                                  <Badge
                                    variant="outline"
                                    className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                                  >
                                    Unassigned
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                        {urgentOrders.length > 3 && (
                          <Button
                            variant="ghost"
                            className="w-full text-theme-blue-500 hover:bg-theme-blue-50 hover:text-theme-blue-600 dark:hover:bg-theme-blue-900/20"
                            asChild
                          >
                            <Link href="/schedule">
                              View all {urgentOrders.length} urgent orders
                              <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <CheckCircle2 className="mb-2 h-10 w-10 text-green-500" />
                  <p className="text-muted-foreground">
                    All orders are assigned and on track
                  </p>
                </div>
              )}
              {(userRole === "owner" || userRole === "admin") &&
                (unassignedOrders.length > 0 || urgentOrders.length > 0) && (
                  <CardFooter className="px-0 pt-4">
                    <Button asChild className="btn-primary w-full">
                      <Link href="/schedule">
                        <Route className="mr-2 h-4 w-4" />
                        Go to Schedule Board
                      </Link>
                    </Button>
                  </CardFooter>
                )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
