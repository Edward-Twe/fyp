"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import {
  Users,
  Package,
  MapPin,
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Route,
  ArrowRight,
  Plus,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import type { Employees, Roles } from "@prisma/client"
import type { JobOrderWithTasks } from "@/app/types/routing"

interface ScheduleOverviewProps {
  employees: Employees[]
  jobOrders: JobOrderWithTasks[]
  userRole: Roles | null
}

export function ScheduleOverview({ employees, jobOrders, userRole }: ScheduleOverviewProps) {
  const [activeTab, setActiveTab] = useState<"employees" | "orders">("employees")

  // Calculate metrics
  const totalEmployees = employees.length
  const totalOrders = jobOrders.length
  const completedOrders = jobOrders.filter((order) => order.status === "completed").length
  const inProgressOrders = jobOrders.filter((order) => order.status === "inprogress").length
  const todoOrders = jobOrders.filter((order) => order.status === "todo").length
  const completionRate = totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0

  // Calculate employee metrics
  const employeeMetrics = employees.map((employee) => {
    const assignedOrders = jobOrders.filter((order) => order.employeeId === employee.id)
    const assignedOrdersCount = assignedOrders.length
    const completedOrdersCount = assignedOrders.filter((order) => order.status === "completed").length
    const spaceUsed = assignedOrders.reduce((sum, order) => sum + Number(order.spaceRequried), 0)
    const spaceCapacity = Number(employee.space || 0)
    const spaceUtilization = spaceCapacity > 0 ? Math.round((spaceUsed / spaceCapacity) * 100) : 0

    return {
      ...employee,
      assignedOrdersCount,
      completedOrdersCount,
      completionRate: assignedOrdersCount > 0 ? Math.round((completedOrdersCount / assignedOrdersCount) * 100) : 0,
      spaceUsed,
      spaceCapacity,
      spaceUtilization,
    }
  })

  // Sort employees by different metrics
  const topEmployeesByCompletion = [...employeeMetrics]
    .filter((emp) => emp.assignedOrdersCount > 0)
    .sort((a, b) => b.completionRate - a.completionRate)
    .slice(0, 5)

  const employeesAtCapacity = employeeMetrics
    .filter((emp) => emp.spaceUtilization >= 90)
    .sort((a, b) => b.spaceUtilization - a.spaceUtilization)

  // Find orders that need attention (no assigned employee or todo status)
  const unassignedOrders = jobOrders.filter((order) => !order.employeeId)
  const urgentOrders = jobOrders.filter(
    (order) => order.status === "todo" && new Date(order.createdAt).getTime() < Date.now() - 24 * 60 * 60 * 1000, // Older than 24 hours
  )

  return (
    <div className="space-y-6">
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
              <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">{totalEmployees}</div>
                <Users className="h-8 w-8 text-theme-blue-500" />
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                {employeesAtCapacity.length > 0 ? (
                  <span className="text-amber-600 dark:text-amber-400">{employeesAtCapacity.length} at capacity</span>
                ) : (
                  <span className="text-green-600 dark:text-green-400">All employees have capacity</span>
                )}
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
              <CardTitle className="text-sm font-medium">Job Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">{totalOrders}</div>
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
                <Badge variant="outline" className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                  {todoOrders} todo
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
              <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">{completionRate}%</div>
                <TrendingUp className="h-8 w-8 text-theme-blue-500" />
              </div>
              <div className="mt-2">
                <Progress
                  value={completionRate}
                  className="h-2"
                  classNameIndicator={cn(
                    completionRate >= 70 ? "bg-green-500" : completionRate >= 40 ? "bg-amber-500" : "bg-red-500",
                  )}
                />
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
              <CardTitle className="text-sm font-medium">Needs Attention</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">{unassignedOrders.length + urgentOrders.length}</div>
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
                  <Badge variant="outline" className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                    {urgentOrders.length} urgent
                  </Badge>
                )}
                {unassignedOrders.length === 0 && urgentOrders.length === 0 && (
                  <span className="text-green-600 dark:text-green-400">All orders on track</span>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Tabs for Employees and Orders */}
      <div className="flex space-x-2 border-b border-border pb-2">
        <Button
          variant="ghost"
          className={cn(
            "rounded-none border-b-2 border-transparent pb-2",
            activeTab === "employees" && "border-theme-blue-500 text-theme-blue-600 dark:text-theme-blue-400",
          )}
          onClick={() => setActiveTab("employees")}
        >
          <Users className="mr-2 h-4 w-4" />
          Employees
        </Button>
        <Button
          variant="ghost"
          className={cn(
            "rounded-none border-b-2 border-transparent pb-2",
            activeTab === "orders" && "border-theme-blue-500 text-theme-blue-600 dark:text-theme-blue-400",
          )}
          onClick={() => setActiveTab("orders")}
        >
          <Package className="mr-2 h-4 w-4" />
          Orders
        </Button>
      </div>

      {/* Employee Overview */}
      {activeTab === "employees" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Top Performing Employees */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }}>
            <Card className="glass-card h-full">
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <CheckCircle2 className="mr-2 h-5 w-5 text-theme-blue-500" />
                  Top Performing Employees
                </CardTitle>
                <CardDescription>Based on completion rate</CardDescription>
              </CardHeader>
              <CardContent className="max-h-[350px] overflow-y-auto">
                {topEmployeesByCompletion.length > 0 ? (
                  <div className="space-y-4">
                    {topEmployeesByCompletion.map((employee) => (
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
                            <p className="text-xs text-muted-foreground">{employee.area || "No area assigned"}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{employee.completionRate}% completed</p>
                          <p className="text-xs text-muted-foreground">
                            {employee.completedOrdersCount}/{employee.assignedOrdersCount} orders
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Users className="mb-2 h-10 w-10 text-muted-foreground" />
                    <p className="text-muted-foreground">No employee data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Employees at Capacity */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }}>
            <Card className="glass-card h-full">
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <AlertTriangle className="mr-2 h-5 w-5 text-amber-500" />
                  Employees at Capacity
                </CardTitle>
                <CardDescription>Space utilization over 90%</CardDescription>
              </CardHeader>
              <CardContent className="max-h-[350px] overflow-y-auto">
                {employeesAtCapacity.length > 0 ? (
                  <div className="space-y-4">
                    {employeesAtCapacity.map((employee) => (
                      <div
                        key={employee.id}
                        className="rounded-lg border border-border bg-white/50 p-3 dark:bg-gray-800/50"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarFallback className="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                                {employee.name.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{employee.name}</p>
                              <p className="text-xs text-muted-foreground">{employee.area || "No area assigned"}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">{employee.spaceUtilization}% utilized</p>
                            <p className="text-xs text-muted-foreground">
                              {employee.spaceUsed}/{employee.spaceCapacity} space units
                            </p>
                          </div>
                        </div>
                        <div className="mt-2">
                          <Progress
                            value={employee.spaceUtilization}
                            className="h-2"
                            classNameIndicator={cn(
                              employee.spaceUtilization >= 95
                                ? "bg-red-500"
                                : employee.spaceUtilization >= 90
                                  ? "bg-amber-500"
                                  : "bg-theme-blue-500",
                            )}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <CheckCircle2 className="mb-2 h-10 w-10 text-green-500" />
                    <p className="text-muted-foreground">All employees have available capacity</p>
                  </div>
                )}
              </CardContent>
              {(userRole === "owner" || userRole === "admin") && employeesAtCapacity.length > 0 && (
                <CardFooter>
                  <Button asChild className="w-full btn-primary">
                    <Link href="/employees/create">
                      <Plus className="mr-2 h-4 w-4" />
                      Add New Employee
                    </Link>
                  </Button>
                </CardFooter>
              )}
            </Card>
          </motion.div>
        </div>
      )}

      {/* Orders Overview */}
      {activeTab === "orders" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Unassigned Orders */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }}>
            <Card className="glass-card h-full">
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <Package className="mr-2 h-5 w-5 text-theme-blue-500" />
                  Unassigned Orders
                </CardTitle>
                <CardDescription>Orders that need to be assigned to employees</CardDescription>
              </CardHeader>
              <CardContent className="max-h-[350px] overflow-y-auto">
                {unassignedOrders.length > 0 ? (
                  <div className="space-y-3">
                    {unassignedOrders.slice(0, 5).map((order) => (
                      <div
                        key={order.id}
                        className="rounded-lg border border-border bg-white/50 p-3 dark:bg-gray-800/50"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">Order #{order.orderNumber}</p>
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">{order.address}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className="bg-theme-blue-100 text-theme-blue-700 dark:bg-theme-blue-900/30 dark:text-theme-blue-300"
                            >
                              Space: {order.spaceRequried.toString()}
                            </Badge>
                            <Badge
                              variant="outline"
                              className={cn(
                                order.status === "todo"
                                  ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                                  : order.status === "inprogress"
                                    ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300"
                                    : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
                              )}
                            >
                              {order.status || "todo"}
                            </Badge>
                          </div>
                        </div>
                        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>Created: {new Date(order.createdAt).toLocaleDateString()}</span>
                          <MapPin className="ml-2 h-3 w-3" />
                          <span>Tasks: {order.JobOrderTask.length}</span>
                        </div>
                      </div>
                    ))}
                    {unassignedOrders.length > 5 && (
                      <Button
                        variant="ghost"
                        className="w-full text-theme-blue-500 hover:text-theme-blue-600 hover:bg-theme-blue-50 dark:hover:bg-theme-blue-900/20"
                        asChild
                      >
                        <Link href="/schedule">
                          View all {unassignedOrders.length} unassigned orders
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <CheckCircle2 className="mb-2 h-10 w-10 text-green-500" />
                    <p className="text-muted-foreground">All orders are assigned</p>
                  </div>
                )}
              </CardContent>
              {(userRole === "owner" || userRole === "admin") && unassignedOrders.length > 0 && (
                <CardFooter>
                  <Button asChild className="w-full btn-primary">
                    <Link href="/schedule">
                      <Route className="mr-2 h-4 w-4" />
                      Go to Schedule Board
                    </Link>
                  </Button>
                </CardFooter>
              )}
            </Card>
          </motion.div>

          {/* Urgent Orders */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }}>
            <Card className="glass-card h-full">
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <AlertTriangle className="mr-2 h-5 w-5 text-red-500" />
                  Urgent Orders
                </CardTitle>
                <CardDescription>Orders that need immediate attention</CardDescription>
              </CardHeader>
              <CardContent className="max-h-[350px] overflow-y-auto">
                {urgentOrders.length > 0 ? (
                  <div className="space-y-3">
                    {urgentOrders.slice(0, 5).map((order) => (
                      <div
                        key={order.id}
                        className="rounded-lg border border-red-200 bg-red-50/50 p-3 dark:border-red-900/30 dark:bg-red-900/10"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">Order #{order.orderNumber}</p>
                              <Badge
                                variant="outline"
                                className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                              >
                                {order.status || "todo"}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">{order.address}</p>
                          </div>
                          <div>
                            {order.employeeId ? (
                              <p className="text-xs font-medium">
                                Assigned to: {employees.find((e) => e.id === order.employeeId)?.name || "Unknown"}
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
                        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>Created: {new Date(order.createdAt).toLocaleDateString()}</span>
                          <MapPin className="ml-2 h-3 w-3" />
                          <span>Tasks: {order.JobOrderTask.length}</span>
                        </div>
                      </div>
                    ))}
                    {urgentOrders.length > 5 && (
                      <Button
                        variant="ghost"
                        className="w-full text-theme-blue-500 hover:text-theme-blue-600 hover:bg-theme-blue-50 dark:hover:bg-theme-blue-900/20"
                        asChild
                      >
                        <Link href="/schedule">
                          View all {urgentOrders.length} urgent orders
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <CheckCircle2 className="mb-2 h-10 w-10 text-green-500" />
                    <p className="text-muted-foreground">No urgent orders</p>
                  </div>
                )}
              </CardContent>
              {(userRole === "owner" || userRole === "admin") && urgentOrders.length > 0 && (
                <CardFooter>
                  <Button asChild className="w-full btn-primary">
                    <Link href="/schedule">
                      <Route className="mr-2 h-4 w-4" />
                      Go to Schedule Board
                    </Link>
                  </Button>
                </CardFooter>
              )}
            </Card>
          </motion.div>
        </div>
      )}
    </div>
  )
}