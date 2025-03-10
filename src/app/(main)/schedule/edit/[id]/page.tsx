"use client"

import KanbanBoard from "@/components/kanban-board"
import { SelectionDialog } from "@/components/SelectionDialog"
import { DepartureDialog, type DepartureInfo } from "@/components/DepartureDialog"
import type { Employees, Roles } from "@prisma/client"
import { startTransition, useEffect, useState } from "react"
import { loadEmployees } from "@/app/(main)/employees/loadEmployees"
import { useOrganization } from "@/app/contexts/OrganizationContext"
import { loadJobOrders } from "@/app/(main)/job-orders/loadJobOrders"
import { parseISO, isValid, format } from "date-fns"
import { Button } from "@/components/ui/button"
import { optimizeRoutes } from "@/app/(main)/schedule/utils/AutoSced"
import type { Location, JobOrderWithTasks, Columns } from "@/app/types/routing"
import { ErrorAlert } from "@/components/ui/alert-box"
import type { UpdateScheduleValues } from "@/lib/validation"
import { useParams, useRouter } from "next/navigation"
import { useToast } from "@/components/hooks/use-toast"
import { editSchedule, findSchedule, getEmployees } from "./action"
import { SaveScheduleDialog } from "../../utils/save-schedule-dialog"
import { LoadingDialog } from "@/components/LoadingDialog"
import { DistanceDialog } from "@/app/(main)/schedule/utils/auto-sched-dialog"
import { CreateMessage } from "@/app/(main)/updates/action"
import { calculateTotalDistanceAndTime, calculateTotalSpace } from "../../utils/calculateRoute"
import { validateRole } from "@/roleAuth"
import { useSession } from "@/app/(main)/SessionProvider"
import { findEmployeebyUserId } from "../../loadSchedules"
import { updateLocation } from "../../utils/updateLocation"
import { ChevronDown, ChevronUp, Calendar, MapPin, Clock, Users, Package, Zap, Save, Map } from "lucide-react"

export default function SchedulesPage() {
  const { user } = useSession()
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false)
  const { selectedOrg } = useOrganization()
  const [employees, setEmployees] = useState<Employees[]>([])
  const [jobOrders, setJobOrders] = useState<JobOrderWithTasks[]>([])
  const [selectedEmployees, setSelectedEmployees] = useState<Employees[]>([])
  const [selectedJobOrders, setSelectedJobOrders] = useState<JobOrderWithTasks[]>([])
  const [departure, setDeparture] = useState<DepartureInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [columns, setColumns] = useState<Columns>({})
  const [scheduleName, setScheduleName] = useState<string | undefined>(undefined)
  const { toast } = useToast()
  const router = useRouter()
  const params = useParams()
  const { id } = params
  const [isAutoScheduling, setIsAutoScheduling] = useState(false)
  const [isDistanceDialogOpen, setIsDistanceDialogOpen] = useState(false)
  const [maxDistance, setMaxDistance] = useState<number>(0)
  const [tempDistance, setTempDistance] = useState<string>("")
  const [isSaving, setIsSaving] = useState(false)
  const [userRole, setUserRole] = useState<Roles | null>(null)
  const [isTracking, setIsTracking] = useState(false)
  const [employeeId, setEmployeeId] = useState<string | null>(null)
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null)
  const [isDepartureExpanded, setIsDepartureExpanded] = useState(false)

  useEffect(() => {
    if (!id || !selectedOrg || !userRole) {
      return // Wait for both org and role to be available
    }

    async function fetchEmpJob() {
      if (!selectedOrg) return
      try {
        const emp = await loadEmployees(selectedOrg.id)
        const job = await loadJobOrders(selectedOrg.id)

        if ("error" in emp) {
          setError(emp.error)
        } else if ("error" in job) {
          setError(job.error)
        } else {
          setEmployees(emp)
          setJobOrders(job)
          setError(null)
        }
      } catch (err) {
        setError("An unexpected error occurred")
        console.error(err)
      }
    }

    const getSchedule = async () => {
      if (!selectedOrg) return
      try {
        const fetchedSchedule = await findSchedule(id as string)
        let scheduledEmployees = await getEmployees(id as string)

        if (!fetchedSchedule || !scheduledEmployees) {
          setError("Schedule doesn't exist.")
          return
        }

        let scheduledJobOrders = fetchedSchedule.jobOrder
        setDeparture({
          datetime: fetchedSchedule.departTime,
          location: {
            address: fetchedSchedule.departAddress,
            city: fetchedSchedule.departCity,
            postCode: fetchedSchedule.departPostCode,
            state: fetchedSchedule.departState,
            country: fetchedSchedule.departCountry,
            latitude: Number(fetchedSchedule.departLatitude),
            longitude: Number(fetchedSchedule.departLongitude),
            placeId: fetchedSchedule.departPlaceId,
          },
        })

        if (userRole !== "owner" && userRole !== "admin") {
          const employeeId = await findEmployeebyUserId(user?.id, selectedOrg.id)
          if (employeeId) {
            setEmployeeId(employeeId.id)
          }
          scheduledEmployees = scheduledEmployees.filter((emp) => emp.id === employeeId?.id)
          scheduledJobOrders = scheduledJobOrders.filter((job) => job.employeeId === employeeId?.id)
        }

        setSelectedEmployees(scheduledEmployees)
        setSelectedJobOrders(scheduledJobOrders)

        const newColumns: Columns = {
          jobOrders: {
            id: "jobOrders",
            title: "Job Orders",
            jobOrders: [],
          },
        }

        fetchedSchedule.jobOrder.forEach((jo) => {
          const employee = jo.scheduledEmp

          if (employee) {
            if (!newColumns[employee.id]) {
              newColumns[employee.id] = {
                id: employee.id,
                title: employee.name,
                jobOrders: [],
              }
            }

            newColumns[employee.id].jobOrders.push(jo)
          } else {
            newColumns.jobOrders.jobOrders.push(jo)
          }
        })

        Object.values(newColumns).forEach((column) => {
          column.jobOrders.sort((a, b) => (a.scheduledOrder || 0) - (b.scheduledOrder || 0))
        })

        setColumns(newColumns)
        setScheduleName(fetchedSchedule.name)
      } catch (err) {
        console.error("Error during fetch:", err)
        setError("Failed to fetch job order")
      }
    }

    setIsLoading(true)
    Promise.all([fetchEmpJob(), getSchedule()]).finally(() => setIsLoading(false))
  }, [selectedOrg, id, userRole, user?.id]) // Make sure userRole is in dependencies

  useEffect(() => {
    async function fetchUserRole() {
      if (!selectedOrg) return

      const role = await validateRole(user, selectedOrg.id)
      setUserRole(role)
    }

    fetchUserRole()
  }, [selectedOrg, user])

  const getValidDateString = (date: Date | string | null | undefined): string => {
    if (!date) return new Date().toISOString()

    try {
      if (date instanceof Date) {
        return isValid(date) ? date.toISOString() : new Date().toISOString()
      }

      const parsedDate = parseISO(date)
      if (isValid(parsedDate)) {
        return parsedDate.toISOString()
      }

      return new Date().toISOString()
    } catch {
      return new Date().toISOString()
    }
  }

  async function autoSchedule(distance?: number) {
    if (!departure || selectedEmployees.length === 0 || selectedJobOrders.length === 0) {
      setError("Please select departure location, employees, and job orders")
      return
    }

    setIsAutoScheduling(true)
    try {
      const depot: Location = {
        lat: departure.location.latitude,
        lng: departure.location.longitude,
        placeId: departure.location.placeId,
      }

      const distanceToUse = distance ?? maxDistance

      const schedule = await optimizeRoutes(selectedJobOrders, selectedEmployees, depot, distanceToUse)

      const newColumns: Columns = {
        jobOrders: {
          id: "jobOrders",
          title: "Job Orders",
          jobOrders: [...selectedJobOrders],
        },
      }

      // Create empty columns for all selected employees
      selectedEmployees.forEach((employee) => {
        newColumns[employee.id] = {
          id: employee.id,
          title: employee.name,
          jobOrders: [],
        }
      })

      // Only distribute job orders if optimization was successful
      if (schedule.assignments && schedule.assignments.length > 0 && !schedule.error) {
        // Clear the jobOrders column as we'll redistribute
        newColumns.jobOrders.jobOrders = []

        schedule.assignments.forEach((assignment) => {
          if (assignment.employeeId === "jobOrders") {
            newColumns.jobOrders.jobOrders = assignment.jobOrders as JobOrderWithTasks[]
          } else {
            const employee = selectedEmployees.find((emp) => emp.id === assignment.employeeId)
            if (employee) {
              newColumns[employee.id] = {
                id: employee.id,
                title: employee.name,
                jobOrders: assignment.jobOrders as JobOrderWithTasks[],
              }
            }
          }
        })
      } else {
        toast({
          variant: "destructive",
          title: "Auto-scheduling failed",
          description: schedule.error || "Route optimization failed. All job orders remain unassigned.",
        })
      }

      setColumns(newColumns)
    } catch (error) {
      console.error("Error in auto-scheduling:", error)
      toast({
        variant: "destructive",
        title: "Auto-scheduling failed",
        description: "An error occurred during route optimization. All job orders remain unassigned.",
      })
    } finally {
      setIsAutoScheduling(false)
    }
  }

  const handleConfirm = () => {
    const distance = Number(tempDistance)
    if (distance > 0) {
      setMaxDistance(distance)
      setIsDistanceDialogOpen(false)
      autoSchedule(distance)
    } else {
      setError("Please enter a valid number greater than 0")
    }
  }

  async function handleSave(name: string) {
    if (!departure || !selectedOrg) {
      setError("Missing required information")
      return
    }

    // Check if any employees have job orders assigned
    const hasAssignments = Object.entries(columns).some(([columnId, column]) => {
      return columnId !== "jobOrders" && column.jobOrders.length > 0
    })

    if (!hasAssignments) {
      toast({
        title: "Cannot Save Schedule",
        description: "You must assign at least one job order to an employee before saving.",
        variant: "destructive",
      })
      return
    }

    // Calculate total distance, time, and space for each column
    const updatedColumns: Columns = { ...columns }
    for (const columnId in updatedColumns) {
      const column = updatedColumns[columnId]
      if (columnId !== "jobOrders" && column.jobOrders.length > 0) {
        const { totalDistance, totalTime } = await calculateTotalDistanceAndTime(column.jobOrders, departure)
        const totalSpace = await calculateTotalSpace(column.jobOrders)

        // Update the column with calculated values
        column.totalDistance = totalDistance ?? 0
        column.totalTime = totalTime ?? 0
        column.totalSpace = Number(totalSpace) ?? 0
        column.totalOrders = column.jobOrders.length
      }
    }

    // Prepare schedule data
    const scheduleData: UpdateScheduleValues = {
      id: id as string,
      name,
      departAddress: departure.location.address,
      departCity: departure.location.city,
      departPostCode: departure.location.postCode,
      departState: departure.location.state,
      departCountry: departure.location.country,
      departLatitude: departure.location.latitude,
      departLongitude: departure.location.longitude,
      departTime: departure.datetime,
      departPlaceId: departure.location.placeId,
    }

    // Validate that scheduleData and updatedColumns are not null
    if (!scheduleData || !updatedColumns) {
      setError("Invalid data: scheduleData or updatedColumns is null")
      return
    }

    setError(null)
    setIsSaving(true)
    startTransition(async () => {
      try {
        const result = await editSchedule(scheduleData, updatedColumns)
        if (result && result.error) {
          toast({
            title: "Error",
            description: `Error updating schedule #${scheduleData.id}`,
            variant: "destructive",
          })
        } else {
          toast({
            title: "Success",
            description: `Successfully updated schedule #${scheduleData.id}`,
          })
          const messageResult = await CreateMessage(`edited Schedule: ${scheduleData.name}`, selectedOrg!)
          if (messageResult && messageResult.error) {
            toast({
              title: "Error",
              description: `Error creating update message`,
              variant: "destructive",
            })
          }
          router.push("/schedule")
        }
      } catch (err) {
        console.error("Error updating schedule:", err)
        setError("An unexpected error occurred. Please try again.")
      } finally {
        setIsSaving(false)
      }
    })
  }
  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    const updateColumns = (newSelectedEmployees: Employees[], newSelectedJobOrders: JobOrderWithTasks[]) => {
      const newColumns: Columns = {
        jobOrders: {
          id: "jobOrders",
          title: "Job Orders",
          jobOrders: [],
        },
      }

      // Create columns for all selected employees
      newSelectedEmployees.forEach((employee) => {
        newColumns[employee.id] = {
          id: employee.id,
          title: employee.name,
          jobOrders: [],
          currentLat: employee.currentLat ? Number(employee.currentLat) : 1000,
          currentLng: employee.currentLong ? Number(employee.currentLong) : 1000,
          lastUpdatedAt: employee.lastUpdatedAt ? employee.lastUpdatedAt : null,
        }
      })

      // Distribute job orders to their respective columns
      newSelectedJobOrders.forEach((jobOrder) => {
        let placed = false
        for (const columnId in newColumns) {
          if (columnId !== "jobOrders" && columns[columnId]?.jobOrders.some((jo) => jo.id === jobOrder.id)) {
            newColumns[columnId].jobOrders.push(jobOrder)
            placed = true
            break
          }
        }
        if (!placed) {
          newColumns.jobOrders.jobOrders.push(jobOrder)
        }
      })

      setColumns(newColumns)
    }
    updateColumns(selectedEmployees, selectedJobOrders)
  }, [selectedEmployees, selectedJobOrders])
  /* eslint-enable react-hooks/exhaustive-deps */

  const handleLocationTracking = async () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.")
      return
    }

    if (isTracking) {
      if (intervalId) {
        clearInterval(intervalId)
        setIsTracking(false)
        setIntervalId(null)
      }
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords

        await updateLocation(latitude, longitude, selectedOrg!.id, employeeId!, id as string)

        const newIntervalId = setInterval(
          async () => {
            navigator.geolocation.getCurrentPosition(async (position) => {
              const { latitude, longitude } = position.coords
              await updateLocation(latitude, longitude, selectedOrg!.id, employeeId!, id as string)
            })
          },
          5 * 60 * 1000, // 5 minutes
        )

        setIntervalId(newIntervalId)
        setIsTracking(true)
      },
      (error) => {
        setError("Unable to retrieve your location. Please check your settings.")
        console.error(error)
      },
    )
  }

  useEffect(() => {
    return () => {
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  }, [intervalId])

  if (isLoading)
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

  if (!id) return <h1>No ID provided.</h1>

  if (!selectedOrg) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center p-8 text-center">
        <div className="glass-card max-w-md p-8 animate-fade-in">
          <div className="mb-6 text-theme-blue-500 dark:text-theme-blue-400">
            <Calendar className="mx-auto h-16 w-16" />
          </div>
          <h1 className="mb-4 text-2xl font-bold text-gradient">Organization Required</h1>
          <p className="mb-6 text-muted-foreground">Please select or create an organization to create schedules.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden app-background">
      <ErrorAlert error={error} onClose={() => setError(null)} />
      <div className="flex-shrink-0 space-y-4 p-4 pb-0">
        <div className="schedule-header flex flex-wrap gap-4 bg-white/90 dark:bg-gray-800/90">
          {userRole === "owner" || userRole === "admin" ? (
            <>
              <SelectionDialog
                title="Employees"
                items={employees}
                selectedItems={selectedEmployees}
                getItemId={(employee) => employee.id}
                getItemLabel={(employee) => `${employee.name}`}
                onSelectionChange={(newSelectedEmployees) => {
                  setSelectedEmployees(newSelectedEmployees)
                }}
                icon={<Users className="h-4 w-4 text-theme-blue-500" />}
              />
              <SelectionDialog
                title="Job Orders"
                items={jobOrders}
                selectedItems={selectedJobOrders}
                getItemId={(jobOrder) => jobOrder.id}
                getItemLabel={(jobOrder) => jobOrder.orderNumber}
                getItemDate={(jobOrder) => getValidDateString(jobOrder.createdAt)}
                getItemStatus={(jobOrder) => jobOrder.status}
                onSelectionChange={(newSelectedJobOrders) => {
                  setSelectedJobOrders(newSelectedJobOrders)
                }}
                icon={<Package className="h-4 w-4 text-theme-blue-500" />}
              />
              <DepartureDialog
                departure={departure}
                onDepartureChange={setDeparture}
                icon={<MapPin className="h-4 w-4 text-theme-blue-500" />}
              />
              <Button
                size="sm"
                variant="outline"
                className="flex items-center gap-2 bg-white/90 hover:bg-theme-blue-50 dark:bg-gray-800/90 dark:hover:bg-theme-blue-900/30"
                onClick={() => {
                  setTempDistance(maxDistance.toString())
                  setIsDistanceDialogOpen(true)
                }}
              >
                <Zap className="h-4 w-4 text-theme-blue-500" />
                AutoSched
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex items-center gap-2 bg-white/90 hover:bg-theme-blue-50 dark:bg-gray-800/90 dark:hover:bg-theme-blue-900/30"
                onClick={() => setIsSaveDialogOpen(true)}
                disabled={
                  !departure ||
                  !selectedOrg ||
                  !Object.entries(columns).some(
                    ([columnId, column]) => columnId !== "jobOrders" && column.jobOrders.length > 0,
                  )
                }
              >
                <Save className="h-4 w-4 text-theme-blue-500" />
                Save
              </Button>
            </>
          ) : (
            <>
              <Button
                size="sm"
                variant={isTracking ? "destructive" : "outline"}
                className="flex items-center gap-2"
                onClick={handleLocationTracking}
              >
                <Map className="h-4 w-4" />
                {isTracking ? "Stop Tracking" : "Track Location"}
              </Button>
              <div className="flex items-center">
                <div
                  className={`flex h-8 items-center justify-center rounded-md px-3 text-white ${
                    isTracking ? "bg-green-500 dark:bg-green-600" : "bg-red-500 dark:bg-red-600"
                  }`}
                >
                  {isTracking ? (
                    <span className="relative flex items-center">
                      <span>Tracking</span>
                      <span className="animate-pulse-opacity ml-1">...</span>
                    </span>
                  ) : (
                    "Not Tracking"
                  )}
                </div>
              </div>
            </>
          )}
          {departure && selectedOrg && (
            <SaveScheduleDialog
              isOpen={isSaveDialogOpen}
              onClose={() => setIsSaveDialogOpen(false)}
              onSave={handleSave}
              scheduleName={scheduleName}
            />
          )}
        </div>

        {departure && (
          <div className="departure-info bg-white/90 dark:bg-gray-800/90">
            <button
              className="flex w-full items-center justify-between"
              onClick={() => setIsDepartureExpanded(!isDepartureExpanded)}
            >
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-theme-blue-500" />
                <span className="font-medium">Departure Information</span>
              </div>
              {isDepartureExpanded ? (
                <ChevronUp className="h-4 w-4 text-theme-blue-500" />
              ) : (
                <ChevronDown className="h-4 w-4 text-theme-blue-500" />
              )}
            </button>
            {isDepartureExpanded && (
              <div className="mt-3 grid gap-2 rounded-md bg-blue-50/50 p-3 dark:bg-blue-900/20">
                <div className="flex items-start gap-2">
                  <Clock className="mt-0.5 h-4 w-4 text-theme-blue-500" />
                  <div>
                    <span className="font-medium">Date/Time:</span>{" "}
                    <span className="text-muted-foreground">
                      {format(departure.datetime, "PPP")} at {format(departure.datetime, "p")}
                    </span>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 text-theme-blue-500" />
                  <div>
                    <div>
                      <span className="font-medium">Location:</span>{" "}
                      <span className="text-muted-foreground">{departure.location.address}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {departure.location.city}, {departure.location.state} {departure.location.postCode},{" "}
                      {departure.location.country}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex-grow overflow-hidden">
        {selectedEmployees.length === 0 || selectedJobOrders.length === 0 ? (
          <div className="flex h-full items-center justify-center p-8 text-center">
            <div className="max-w-md space-y-4 rounded-lg bg-white/90 p-6 shadow-lg dark:bg-gray-800/90">
              <div className="flex justify-center">
                <Calendar className="h-12 w-12 text-theme-blue-500" />
              </div>
              <h3 className="text-xl font-semibold">Ready to Schedule</h3>
              <p className="text-muted-foreground">
                Please select employees and job orders to start scheduling your tasks
              </p>
              {userRole === "owner" || userRole === "admin" ? (
                <div className="flex justify-center gap-4">
                  <Button
                    variant="outline"
                    className="flex items-center gap-2"
                    onClick={() => (document.querySelector('[title="Employees"]') as HTMLElement)?.click()}
                  >
                    <Users className="h-4 w-4" />
                    Select Employees
                  </Button>
                  <Button
                    variant="outline"
                    className="flex items-center gap-2"
                    onClick={() => (document.querySelector('[title="Job Orders"]') as HTMLElement)?.click()}
                  >
                    <Package className="h-4 w-4" />
                    Select Job Orders
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No job orders have been assigned to you for this schedule yet.
                </p>
              )}
            </div>
          </div>
        ) : (
          <KanbanBoard
            employees={selectedEmployees}
            jobOrders={selectedJobOrders}
            columns={columns}
            onColumnsChange={setColumns}
            depot={departure?.location}
            userRole={userRole}
            orgId={selectedOrg.id}
          />
        )}
      </div>

      <LoadingDialog
        isOpen={isAutoScheduling || isSaving}
        message={isAutoScheduling ? "Optimizing routes..." : "Saving schedule..."}
      />
      <DistanceDialog
        isOpen={isDistanceDialogOpen}
        onOpenChange={setIsDistanceDialogOpen}
        tempDistance={tempDistance}
        onTempDistanceChange={setTempDistance}
        onConfirm={handleConfirm}
      />
    </div>
  )
}

