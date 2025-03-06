'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { BarChart3, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { useEffect, useState, useCallback } from 'react'
import { useOrganization } from '@/app/contexts/OrganizationContext'
import { loadSchedules } from './schedule/loadSchedules'
import { ScrollArea } from "@/components/ui/scroll-area"
import createOrg from '@/assets/create-org.jpeg'
import schedule from '@/assets/schedule.jpeg'
import tasks from '@/assets/tasks.jpeg'
import employees from '@/assets/employees.jpeg'
import products from '@/assets/products.jpeg'
import { Roles, Schedules } from '@prisma/client'
import { DateRangePicker } from "@/components/DateRangePicker"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DateRange } from "react-day-picker"
import { startOfToday, subDays, startOfYear, startOfMonth, endOfMonth, subMonths } from "date-fns"
import { JobOrderWithTasks } from '../types/routing'
import { cn } from "@/lib/utils"
import { loadUpdates } from './updates/loadUpdates'
import { Button } from "@/components/ui/button"
import { updateMessages } from '@prisma/client'
import { validateRole } from '@/roleAuth'
import { useSession } from './SessionProvider'

interface ScheduleWithJobs extends Schedules {
  jobOrder?: JobOrderWithTasks[]
}

const quickActions = [
  { title: 'Organizations', href: '/organizations/create', image: createOrg },
  { title: 'Schedule', href: '/schedule', image: schedule },
  { title: 'Tasks', href: '/tasks', image: tasks },
  { title: 'Employees', href: '/employees', image: employees },
  { title: 'Products', href: '/products', image: products },
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

type StatsKey = 'totalOrders' | 'completedOrders' | 'totalTasks' | 'completedTasks';

const stats = [
  { 
    key: 'totalOrders' as StatsKey,
    title: 'Total Orders',
    color: 'bg-blue-50 dark:bg-blue-900/50',
    borderColor: 'border-blue-200 dark:border-blue-800',
    compareWithPrevious: true
  },
  { 
    key: 'completedOrders' as StatsKey,
    title: 'Completed Orders',
    color: 'bg-green-50 dark:bg-green-900/50',
    borderColor: 'border-green-200 dark:border-green-800',
    compareWithTotal: 'totalOrders' as StatsKey
  },
  { 
    key: 'totalTasks' as StatsKey,
    title: 'Total Tasks',
    color: 'bg-purple-50 dark:bg-purple-900/50',
    borderColor: 'border-purple-200 dark:border-purple-800',
    compareWithPrevious: true
  },
  { 
    key: 'completedTasks' as StatsKey,
    title: 'Completed Tasks',
    color: 'bg-amber-50 dark:bg-amber-900/50',
    borderColor: 'border-amber-200 dark:border-amber-800',
    compareWithTotal: 'totalTasks' as StatsKey
  }
]

export default function Dashboard() {
  const { selectedOrg } = useOrganization()
  const [schedules, setSchedules] = useState<ScheduleWithJobs[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [selectedPreset, setSelectedPreset] = useState<string>('last7Days')
  const [updates, setUpdates] = useState<updateMessages[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [userRole, setUserRole] = useState<Roles | null>(null)
  const updatesPerPage = 5
  const { user } = useSession();

  useEffect(() => {
    async function fetchSchedules() {
      if (!selectedOrg) return
      const userRole = await validateRole(user, selectedOrg.id)
      setUserRole(userRole)
      try {
        const data = await loadSchedules(selectedOrg.id)
        setSchedules(Array.isArray(data) ? data : [])
      } catch (error) {
        console.error('Failed to fetch schedules:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchSchedules()
  }, [selectedOrg, user])

  useEffect(() => {
    async function fetchUpdates() {
      if (!selectedOrg) return
      try {
        const data = await loadUpdates(selectedOrg.id)
        setUpdates(Array.isArray(data) ? data.sort((a, b) => 
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        ) : [])
      } catch (error) {
        console.error('Failed to fetch updates:', error)
      }
    }

    fetchUpdates()
  }, [selectedOrg])

  const calculateProgress = (schedule: ScheduleWithJobs) => {
    const total = schedule.jobOrder?.length || 0
    const completed = schedule.jobOrder?.filter(job => job.status === 'completed').length || 0
    return total ? Math.round((completed / total) * 100) : 0
  }

  const getProgressColor = (progress: number) => {
    return progress === 100 
      ? 'bg-green-100 dark:bg-green-800/50 border-green-200 dark:border-green-700' 
      : 'bg-yellow-100 dark:bg-yellow-800/50 border-yellow-200 dark:border-yellow-700'
  }

  const getPreviousDateRange = (from: Date, to: Date) => {
    const duration = to.getTime() - from.getTime()
    return {
      from: new Date(from.getTime() - duration),
      to: new Date(from.getTime())
    }
  }

  const calculateStats = useCallback(() => {
    if (!schedules.length) return {
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
      }
    }

    const currentRange = dateRange || datePresets.last7Days
    const previousRange = (() => {
      if (selectedPreset === 'allTime') return undefined;
      if (selectedPreset === 'thisMonth') {
        const previousMonth = subMonths(new Date(), 1)
        return {
          from: startOfMonth(previousMonth),
          to: endOfMonth(previousMonth)
        }
      }
      return currentRange?.from && currentRange?.to ? 
        getPreviousDateRange(currentRange.from, currentRange.to) : 
        undefined
    })()

    const calculatePeriodStats = (from?: Date, to?: Date) => {
      const filteredSchedules = schedules.filter(schedule => {
        if (selectedPreset === 'allTime') return true;
        const scheduleDate = new Date(schedule.departTime)
        return (!from || scheduleDate >= from) &&
               (!to || scheduleDate <= to)
      })

      return filteredSchedules.reduce((acc, schedule) => {
        const orders = schedule.jobOrder || []
        const tasks = orders.flatMap(order => 
          (order.JobOrderTask || []).reduce((sum, task) => sum + (task.quantity || 0), 0)
        )
        const completedTasks = orders
          .filter(o => o.status === 'completed')
          .flatMap(order => 
            (order.JobOrderTask || []).reduce((sum, task) => sum + (task.quantity || 0), 0)
          )
        
        return {
          totalOrders: acc.totalOrders + orders.length,
          completedOrders: acc.completedOrders + orders.filter(o => o.status === 'completed').length,
          totalTasks: acc.totalTasks + tasks.length,
          completedTasks: acc.completedTasks + completedTasks.length,
        }
      }, {
        totalOrders: 0,
        completedOrders: 0,
        totalTasks: 0,
        completedTasks: 0,
      })
    }

    return {
      currentPeriod: calculatePeriodStats(currentRange?.from, currentRange?.to),
      previousPeriod: calculatePeriodStats(previousRange?.from, previousRange?.to)
    }
  }, [schedules, dateRange, selectedPreset])

  if (!selectedOrg) {
    return <h1>Please Select or Create an Organization</h1>
  }

  if (isLoading) {
    return <h1>Loading...</h1>
  }

  return (
    <div className="flex-1 p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
      </div>

      {/* Active Schedules Section */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-6 bg-slate-50 dark:bg-slate-800/50 p-6 rounded-lg border border-slate-200 dark:border-slate-700"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Kanban Boards</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {schedules.map((schedule) => {
            const progress = calculateProgress(schedule)
            return (
              <motion.div 
                key={schedule.id} 
                whileHover={{ scale: 1.02 }} 
                whileTap={{ scale: 0.98 }}
              >
                <Link href={`/schedule/edit/${schedule.id}`}>
                  <Card className={`cursor-pointer border-2 ${getProgressColor(progress)}`}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">{schedule.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Progress</span>
                        <span className="font-medium">{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                      <div className="flex justify-between mt-4 text-sm text-muted-foreground">
                      <span>Total: {schedule.jobOrder?.length || 0}</span>
                      <span>Completed: {schedule.jobOrder?.filter(job => job.status === 'completed').length || 0}</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            )
          })}
        </div>
      </motion.section>

      {/* Overview Stats */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="mb-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Overview</h2>
          <div className="flex gap-2">
            <Select value={selectedPreset} onValueChange={(value) => {
              setSelectedPreset(value)
              setDateRange(datePresets[value as keyof typeof datePresets])
            }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select date range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="last7Days">Last 7 days</SelectItem>
                <SelectItem value="thisMonth">This month</SelectItem>
                <SelectItem value="thisYear">This year</SelectItem>
                <SelectItem value="allTime">All time</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
            {selectedPreset === 'custom' && (
              <DateRangePicker date={dateRange} onDateChange={setDateRange} />
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          

          {stats.map((stat) => {
            const current = calculateStats().currentPeriod[stat.key]
            const previous = calculateStats().previousPeriod[stat.key]
            const total = stat.compareWithTotal ? calculateStats().currentPeriod[stat.compareWithTotal] : null
            const percentChange = stat.compareWithPrevious 
              ? (previous ? ((current - previous) / previous) * 100 : 0)
              : (total ? (current / total) * 100 : 0)

            return (
              <motion.div 
                key={stat.key}
                whileHover={{ scale: 1.03 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                <Card className={`${stat.color} border ${stat.borderColor}`}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{current}</div>
                    <div className={cn(
                      "text-xs mt-1",
                      stat.compareWithPrevious ? (
                        percentChange > 0 ? "text-green-600 dark:text-green-400" : 
                        percentChange < 0 ? "text-red-600 dark:text-red-400" : 
                        "text-gray-600 dark:text-gray-400"
                      ) : "text-gray-600 dark:text-gray-400"
                    )}>
                      {stat.compareWithPrevious ? (
                        percentChange !== 0 ? (
                          <>
                            {percentChange > 0 ? '↑' : '↓'} {Math.abs(Math.round(percentChange))}%
                            {' from previous period'}
                          </>
                        ) : 'No change from previous period'
                      ) : (
                        `${Math.round(percentChange)}% of total`
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      </motion.section>

      {/* Quick Access Links */}
      {userRole === 'admin' || userRole === 'owner' ? (
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
      >
        <Card className="bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800 w-full">
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="mr-2 h-5 w-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {quickActions.map((action, index) => (
                  <Link 
                    key={index}
                    href={action.href}
                    className="relative h-32 rounded-lg overflow-hidden"
                  >
                    <Image
                      src={action.image}
                      alt={action.title}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <span className="text-white font-semibold text-lg">
                        {action.title}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 w-full">
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertCircle className="mr-2 h-5 w-5" />
              Recent Updates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {updates.length > 0 ? (
                <>
                  {updates
                    .slice((currentPage - 1) * updatesPerPage, currentPage * updatesPerPage)
                    .map((update) => (
                      <div 
                        key={update.id} 
                        className="border-b border-amber-200 dark:border-amber-800 last:border-0 pb-2"
                      >
                        <p className="text-sm">{update.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(update.updatedAt).toLocaleDateString()} at{' '}
                          {new Date(update.updatedAt).toLocaleTimeString()}
                        </p>
                      </div>
                    ))}
                  <div className="flex justify-between items-center pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <span className="text-sm">
                      Page {currentPage} of {Math.ceil(updates.length / updatesPerPage)}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(Math.ceil(updates.length / updatesPerPage), p + 1))}
                      disabled={currentPage >= Math.ceil(updates.length / updatesPerPage)}
                    >
                      Next
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground">No recent updates</p>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.section>
      ) : null}
    </div>
  )
}