"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import Image from "next/image"
import {
  BarChart3,
  AlertCircle,
  Calendar,
  ClipboardList,
  ArrowUp,
  ArrowDown,
  Users,
  Package,
  Package2,
  CheckCircle2,
  Clock,
  ListTodo,
  Building2,
  Plus,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { useEffect, useState, useCallback } from "react"
import { useOrganization } from "@/app/contexts/OrganizationContext"
import { loadSchedules } from "./schedule/loadSchedules"
import createOrg from "@/assets/create-org.jpeg"
import schedule from "@/assets/schedule.jpeg"
import tasks from "@/assets/tasks.jpeg"
import employees from "@/assets/employees.jpeg"
import products from "@/assets/products.jpeg"
import type { Roles, Schedules, EmployeeSchedules, Employees } from "@prisma/client"
import { DateRangePicker } from "@/components/DateRangePicker"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { DateRange } from "react-day-picker"
import { startOfToday, subDays, startOfYear, startOfMonth, endOfMonth, subMonths } from "date-fns"
import type { JobOrderWithTasks } from "../types/routing"
import { cn } from "@/lib/utils"
import { loadUpdates } from "./updates/loadUpdates"
import { Button } from "@/components/ui/button"
import type { updateMessages } from "@prisma/client"
import { validateRole } from "@/roleAuth"
import { useSession } from "./SessionProvider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart, PieChart } from "@/components/ui/chart"
import { ScheduleMetrics } from "@/components/dashboard/schedule-metrics"
import { loadEmployees } from "./employees/loadEmployees"
import { loadJobOrders } from "@/app/(main)/job-orders/loadJobOrders"
import { loadEmployeeSchedules } from "@/app/(main)/schedule/loadSchedules"

interface ScheduleWithJobs extends Schedules {
  jobOrder?: JobOrderWithTasks[]
}

const quickActions = [
  { title: "Organizations", href: "/organizations/create", image: createOrg, icon: Building2 },
  { title: "Schedule", href: "/schedule", image: schedule, icon: Calendar },
  { title: "Tasks", href: "/tasks", image: tasks, icon: ListTodo },
  { title: "Employees", href: "/employees", image: employees, icon: Users },
  { title: "Products", href: "/products", image: products, icon: Package },
]

const datePresets = {
  today: {
    from: startOfToday(),
    to: new Date(),
  },
  last7Days: {
    from: subDays(new Date(), 7),
    to: new Date(),
  },
  thisMonth: {
    from: startOfMonth(new Date()),
    to: new Date(),
  },
  thisYear: {
    from: startOfYear(new Date()),
    to: new Date(),
  },
  allTime: undefined,
} as const

type StatsKey = "totalOrders" | "completedOrders" | "totalTasks" | "completedTasks"

const stats = [
  {
    key: "totalOrders" as StatsKey,
    title: "Total Orders",
    icon: Package2,
    color: "bg-blue-50 dark:bg-blue-900/50",
    borderColor: "border-blue-200 dark:border-blue-800",
    compareWithPrevious: true,
  },
  {
    key: "completedOrders" as StatsKey,
    title: "Completed Orders",
    icon: CheckCircle2,
    color: "bg-green-50 dark:bg-green-900/50",
    borderColor: "border-green-200 dark:border-green-800",
    compareWithTotal: "totalOrders" as StatsKey,
  },
  {
    key: "totalTasks" as StatsKey,
    title: "Total Tasks",
    icon: ListTodo,
    color: "bg-purple-50 dark:bg-purple-900/50",
    borderColor: "border-purple-200 dark:border-purple-800",
    compareWithPrevious: true,
  },
  {
    key: "completedTasks" as StatsKey,
    title: "Completed Tasks",
    icon: CheckCircle2,
    color: "bg-amber-50 dark:bg-amber-900/50",
    borderColor: "border-amber-200 dark:border-amber-800",
    compareWithTotal: "totalTasks" as StatsKey,
  },
]

interface EmployeeSchedulesWithRelations extends EmployeeSchedules {
  schedule: Schedules
}

export default function Dashboard() {
  const { selectedOrg } = useOrganization()
  const [schedules, setSchedules] = useState<ScheduleWithJobs[]>([])
  const [employees, setEmployees] = useState<Employees[]>([])
  const [jobOrders, setJobOrders] = useState<JobOrderWithTasks[]>([])
  const [employeeSchedules, setEmployeeSchedules] = useState<EmployeeSchedulesWithRelations[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [selectedPreset, setSelectedPreset] = useState<string>("last7Days")
  const [updates, setUpdates] = useState<updateMessages[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [userRole, setUserRole] = useState<Roles | null>(null)
  const updatesPerPage = 5
  const { user } = useSession()
  const [activeTab, setActiveTab] = useState("overview")

  useEffect(() => {
    async function fetchData() {
      if (!selectedOrg) return
      const userRole = await validateRole(user, selectedOrg.id)
      setUserRole(userRole)
      setIsLoading(true)

      try {
        // Load schedules
        const schedulesData = await loadSchedules(selectedOrg.id)
        setSchedules(Array.isArray(schedulesData) ? schedulesData : [])

        // Load employees
        const employeesData = await loadEmployees(selectedOrg.id)
        setEmployees(Array.isArray(employeesData) ? employeesData : [])

        // Load job orders
        const jobOrdersData = await loadJobOrders(selectedOrg.id)
        setJobOrders(Array.isArray(jobOrdersData) ? jobOrdersData : [])

        // Load employee schedules
        const employeeSchedulesData = await loadEmployeeSchedules(selectedOrg.id)
        setEmployeeSchedules(Array.isArray(employeeSchedulesData) ? employeeSchedulesData : [])
      } catch (error) {
        console.error("Failed to fetch data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [selectedOrg, user])

  useEffect(() => {
    async function fetchUpdates() {
      if (!selectedOrg) return
      try {
        const data = await loadUpdates(selectedOrg.id)
        setUpdates(
          Array.isArray(data)
            ? data.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
            : [],
        )
      } catch (error) {
        console.error("Failed to fetch updates:", error)
      }
    }

    fetchUpdates()
  }, [selectedOrg])

  const calculateProgress = (schedule: ScheduleWithJobs) => {
    const total = schedule.jobOrder?.length || 0
    const completed = schedule.jobOrder?.filter((job) => job.status === "completed").length || 0
    return total ? Math.round((completed / total) * 100) : 0
  }

  const getProgressColor = (progress: number) => {
    return progress === 100
      ? "bg-green-100 dark:bg-green-800/50 border-green-200 dark:border-green-700"
      : "bg-yellow-100 dark:bg-yellow-800/50 border-yellow-200 dark:border-yellow-700"
  }

  const getPreviousDateRange = (from: Date, to: Date) => {
    const duration = to.getTime() - from.getTime()
    return {
      from: new Date(from.getTime() - duration),
      to: new Date(from.getTime()),
    }
  }

  const calculateStats = useCallback(() => {
    if (!schedules.length)
      return {
        currentPeriod: {
          totalOrders: 0,
          completedOrders: 0,
          totalTasks: 0,
          completedTasks: 0,
        },
        previousPeriod: {
          totalOrders: 0,
          completedOrders: 0,
          totalTasks: 0,
          completedTasks: 0,
        },
      }

    const currentRange = dateRange || datePresets.last7Days
    const previousRange = (() => {
      if (selectedPreset === "allTime") return undefined
      if (selectedPreset === "thisMonth") {
        const previousMonth = subMonths(new Date(), 1)
        return {
          from: startOfMonth(previousMonth),
          to: endOfMonth(previousMonth),
        }
      }
      return currentRange?.from && currentRange?.to
        ? getPreviousDateRange(currentRange.from, currentRange.to)
        : undefined
    })()

    const calculatePeriodStats = (from?: Date, to?: Date) => {
      const filteredSchedules = schedules.filter((schedule) => {
        if (selectedPreset === "allTime") return true
        const scheduleDate = new Date(schedule.departTime)
        return (!from || scheduleDate >= from) && (!to || scheduleDate <= to)
      })

      return filteredSchedules.reduce(
        (acc, schedule) => {
          const orders = schedule.jobOrder || []
          const tasks = orders.flatMap((order) =>
            (order.JobOrderTask || []).reduce((sum, task) => sum + (task.quantity || 0), 0),
          )
          const completedTasks = orders
            .filter((o) => o.status === "completed")
            .flatMap((order) => (order.JobOrderTask || []).reduce((sum, task) => sum + (task.quantity || 0), 0))

          return {
            totalOrders: acc.totalOrders + orders.length,
            completedOrders: acc.completedOrders + orders.filter((o) => o.status === "completed").length,
            totalTasks: acc.totalTasks + tasks.length,
            completedTasks: acc.completedTasks + completedTasks.length,
          }
        },
        {
          totalOrders: 0,
          completedOrders: 0,
          totalTasks: 0,
          completedTasks: 0,
        },
      )
    }

    return {
      currentPeriod: calculatePeriodStats(currentRange?.from, currentRange?.to),
      previousPeriod: calculatePeriodStats(previousRange?.from, previousRange?.to),
    }
  }, [schedules, dateRange, selectedPreset])

  // Generate chart data based on stats
  const generateChartData = () => {
    const stats = calculateStats().currentPeriod

    // For orders chart
    const ordersData = [
      { name: "Completed", value: stats.completedOrders },
      { name: "Pending", value: stats.totalOrders - stats.completedOrders },
    ]

    // For tasks chart
    const tasksData = [
      { name: "Completed", value: stats.completedTasks },
      { name: "Pending", value: stats.totalTasks - stats.completedTasks },
    ]

    // For schedule progress chart
    const scheduleProgressData = schedules.map((schedule) => ({
      name: schedule.name.length > 15 ? `${schedule.name.substring(0, 15)}...` : schedule.name,
      progress: calculateProgress(schedule),
    }))

    return { ordersData, tasksData, scheduleProgressData }
  }

  if (!selectedOrg) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center p-8 text-center app-background bg-noise">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="glass-card max-w-md p-8"
        >
          <div className="mb-6 text-theme-blue-500 dark:text-theme-blue-400">
            <ClipboardList className="mx-auto h-16 w-16 floating-element" />
          </div>
          <h1 className="mb-4 text-2xl font-bold text-gradient">Organization Required</h1>
          <p className="mb-6 text-muted-foreground">Please select or create an organization first.</p>
          <Button asChild className="btn-primary w-full">
            <Link href="/organizations/create">
              <Building2 className="mr-2 h-4 w-4" />
              Create Organization
            </Link>
          </Button>
        </motion.div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-8 app-background bg-noise">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-theme-blue-500 dark:text-theme-blue-400"
        >
          <div className="flex flex-col items-center gap-4">
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Number.POSITIVE_INFINITY, duration: 1.5 }}
              className="relative floating-element"
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
    )
  }

  const chartData = generateChartData()

  return (
    <div className="flex-1 p-4 md:p-6 app-background bg-noise min-h-screen">
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
            <h1 className="text-3xl font-bold text-gradient">Dashboard</h1>
            <p className="text-sm text-muted-foreground">Welcome to your organization overview</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Select
            value={selectedPreset}
            onValueChange={(value) => {
              setSelectedPreset(value)
              setDateRange(datePresets[value as keyof typeof datePresets])
            }}
          >
            <SelectTrigger className="w-[180px] input-field">
              <SelectValue placeholder="Select date range" />
            </SelectTrigger>
            <SelectContent className="glass-effect">
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="last7Days">Last 7 days</SelectItem>
              <SelectItem value="thisMonth">This month</SelectItem>
              <SelectItem value="thisYear">This year</SelectItem>
              <SelectItem value="allTime">All time</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
          {selectedPreset === "custom" && (
            <DateRangePicker date={dateRange} onDateChange={setDateRange} className="input-field" />
          )}
        </div>
      </motion.div>

      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="glass-effect p-1 mb-4">
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
          {/* Stats Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4"
          >
            {stats.map((stat, index) => {
              const current = calculateStats().currentPeriod[stat.key]
              const previous = calculateStats().previousPeriod[stat.key]
              const total = stat.compareWithTotal ? calculateStats().currentPeriod[stat.compareWithTotal] : null
              const percentChange = stat.compareWithPrevious
                ? previous
                  ? ((current - previous) / previous) * 100
                  : 0
                : total
                  ? (current / total) * 100
                  : 0

              return (
                <motion.div
                  key={stat.key}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="card-hover-effect"
                >
                  <Card className={`dashboard-card ${stat.color} border ${stat.borderColor} overflow-hidden`}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium stat-label">{stat.title}</CardTitle>
                        <div className={`p-2 rounded-full ${stat.color}`}>
                          <stat.icon className="h-4 w-4 text-theme-blue-600 dark:text-theme-blue-400" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="stat-value">{current}</div>
                      <div
                        className={cn(
                          "mt-1 text-xs flex items-center",
                          stat.compareWithPrevious
                            ? percentChange > 0
                              ? "text-green-600 dark:text-green-400"
                              : percentChange < 0
                                ? "text-red-600 dark:text-red-400"
                                : "text-gray-600 dark:text-gray-400"
                            : "text-gray-600 dark:text-gray-400",
                        )}
                      >
                        {stat.compareWithPrevious ? (
                          percentChange !== 0 ? (
                            <>
                              {percentChange > 0 ? (
                                <ArrowUp className="mr-1 h-3 w-3" />
                              ) : (
                                <ArrowDown className="mr-1 h-3 w-3" />
                              )}
                              {Math.abs(Math.round(percentChange))}%{" from previous period"}
                            </>
                          ) : (
                            "No change from previous period"
                          )
                        ) : (
                          `${Math.round(percentChange)}% of total`
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </motion.div>

          {/* Charts Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
          >
            {/* Orders Chart */}
            <Card className="glass-card animate-scale-in">
              <CardHeader>
                <CardTitle className="text-lg">Orders Status</CardTitle>
                <CardDescription>Completed vs Pending Orders</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  <PieChart
                    data={chartData.ordersData}
                    index="name"
                    category="value"
                    valueFormatter={(value) => `${value} orders`}
                    colors={["#4ade80", "#93c5fd"]}
                    className="h-full w-full"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Tasks Chart */}
            <Card className="glass-card animate-scale-in">
              <CardHeader>
                <CardTitle className="text-lg">Tasks Status</CardTitle>
                <CardDescription>Completed vs Pending Tasks</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  <PieChart
                    data={chartData.tasksData}
                    index="name"
                    category="value"
                    valueFormatter={(value) => `${value} tasks`}
                    colors={["#c084fc", "#fbbf24"]}
                    className="h-full w-full"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Schedule Progress Chart */}
            <Card className="glass-card animate-scale-in">
              <CardHeader>
                <CardTitle className="text-lg">Schedule Progress</CardTitle>
                <CardDescription>Completion percentage by schedule</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  <BarChart
                    data={chartData.scheduleProgressData}
                    index="name"
                    categories={["progress"]}
                    colors={["#3b82f6"]}
                    valueFormatter={(value) => `${value}%`}
                    layout="vertical"
                    className="h-full w-full"
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Performance Metrics Section (from Schedules tab) */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="mb-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold flex items-center">
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
                jobOrders={jobOrders}
                employeeSchedules={employeeSchedules}
                userRole={userRole}
              />
            </div>

            {/* Active Schedules */}
            <div className="glass-card p-6 mt-8">
              <div className="mb-4">
                <h2 className="text-xl font-semibold flex items-center">
                  <Calendar className="mr-2 h-5 w-5 text-theme-blue-600 dark:text-theme-blue-400" />
                  Active Schedules
                </h2>
              </div>

              {schedules.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="mb-4 rounded-full bg-theme-blue-100/50 p-4 dark:bg-theme-blue-900/20">
                    <Calendar className="h-8 w-8 text-theme-blue-600 dark:text-theme-blue-400 floating-element" />
                  </div>
                  <h3 className="mb-2 text-xl font-semibold">No active schedules</h3>
                  <p className="mb-6 max-w-md text-muted-foreground">
                    Create your first schedule to start planning and organizing your team&apos;s work.
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
                    const progress = calculateProgress(schedule)
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
                              <CardTitle className="text-lg flex items-center">
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
                                classNameIndicator={progress === 100 ? "bg-green-500" : "bg-theme-blue-500"}
                              />
                              <div className="mt-4 flex justify-between text-sm text-muted-foreground">
                                <span>Total: {schedule.jobOrder?.length || 0}</span>
                                <span>
                                  Completed:{" "}
                                  {schedule.jobOrder?.filter((job) => job.status === "completed").length || 0}
                                </span>
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </div>
          </motion.div>

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
                          .slice((currentPage - 1) * updatesPerPage, currentPage * updatesPerPage)
                          .map((update, index) => (
                            <motion.div
                              key={update.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.3, delay: index * 0.1 }}
                              className="border-b border-theme-blue-100/30 dark:border-theme-blue-900/30 pb-3 last:border-0 animate-slide-in"
                            >
                              <p className="text-sm">{update.message}</p>
                              <p className="mt-1 text-xs text-muted-foreground flex items-center">
                                <Clock className="mr-1 h-3 w-3" />
                                {new Date(update.updatedAt).toLocaleDateString()} at{" "}
                                {new Date(update.updatedAt).toLocaleTimeString()}
                              </p>
                            </motion.div>
                          ))}
                        <div className="flex items-center justify-between pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="btn-secondary"
                          >
                            Previous
                          </Button>
                          <span className="text-sm">
                            Page {currentPage} of {Math.ceil(updates.length / updatesPerPage)}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setCurrentPage((p) => Math.min(Math.ceil(updates.length / updatesPerPage), p + 1))
                            }
                            disabled={currentPage >= Math.ceil(updates.length / updatesPerPage)}
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
                        <p className="text-muted-foreground">No recent updates</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
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
                        className="rounded-lg overflow-hidden card-hover-effect"
                      >
                        <Link href={action.href} className="group block relative h-32 overflow-hidden rounded-lg">
                          <Image
                            src={action.image || "/placeholder.svg"}
                            alt={action.title}
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-110"
                            sizes="(max-width: 768px) 100vw, 50vw"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-theme-blue-900/80 to-theme-blue-900/30 flex items-center justify-center p-4">
                            <div className="text-center">
                              <action.icon className="h-8 w-8 mx-auto mb-2 text-white" />
                              <span className="text-lg font-semibold text-white">{action.title}</span>
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
                          .slice((currentPage - 1) * updatesPerPage, currentPage * updatesPerPage)
                          .map((update, index) => (
                            <motion.div
                              key={update.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.3, delay: index * 0.1 }}
                              className="border-b border-theme-blue-100/30 dark:border-theme-blue-900/30 pb-3 last:border-0 animate-slide-in"
                            >
                              <p className="text-sm">{update.message}</p>
                              <p className="mt-1 text-xs text-muted-foreground flex items-center">
                                <Clock className="mr-1 h-3 w-3" />
                                {new Date(update.updatedAt).toLocaleDateString()} at{" "}
                                {new Date(update.updatedAt).toLocaleTimeString()}
                              </p>
                            </motion.div>
                          ))}
                        <div className="flex items-center justify-between pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="btn-secondary"
                          >
                            Previous
                          </Button>
                          <span className="text-sm">
                            Page {currentPage} of {Math.ceil(updates.length / updatesPerPage)}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setCurrentPage((p) => Math.min(Math.ceil(updates.length / updatesPerPage), p + 1))
                            }
                            disabled={currentPage >= Math.ceil(updates.length / updatesPerPage)}
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
                        <p className="text-muted-foreground">No recent updates</p>
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
  )
}

