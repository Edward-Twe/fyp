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
// Add these imports at the top of the file
import { ChevronDown, ChevronUp } from "lucide-react"

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
  // Add this state variable with the other useState declarations
  const [isDepartureExpanded, setIsDepartureExpanded] = useState(false)

  useEffect(() => {
    if (!id) {
      setError("No ID provided.")
      setIsLoading(false)
      return
    }

    async function fetchEmpJob() {
      if (!selectedOrg) {
        setIsLoading(false)
        setError("Select an Organization")
        return
      }
      setIsLoading(true)
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
      } finally {
        setIsLoading(false)
      }
    }

    fetchEmpJob()

    const getSchedule = async () => {
      if (!selectedOrg) {
        setIsLoading(false)
        setError("Select an Organization")
        return
      }
      try {
        const fetchedSchedule = await findSchedule(id as string)
        let scheduledEmployees = await getEmployees(id as string)

        if (!fetchedSchedule || !scheduledEmployees) {
          setError("Schedule doesn't exist.")
        } else {
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
        }
      } catch (err) {
        console.error("Error during fetch:", err)
        setError("Failed to fetch job order")
      }
    }

    getSchedule()
  }, [selectedOrg, id, userRole, user])

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

  // Add this useEffect to set the initial state of isDepartureExpanded based on screen size
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsDepartureExpanded(true)
      } else {
        setIsDepartureExpanded(false)
      }
    }

    // Set initial state
    handleResize()

    // Add event listener
    window.addEventListener("resize", handleResize)

    // Clean up
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  if (isLoading) return <div className="p-4">Loading...</div>

  if (!id) return <h1>No ID provided.</h1>

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <ErrorAlert error={error} onClose={() => setError(null)} />
      <div className="flex-shrink-0 space-y-4 p-4 pb-0">
        <div className="flex gap-4">
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
              />
              <DepartureDialog departure={departure} onDepartureChange={setDeparture} />
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setTempDistance(maxDistance.toString())
                  setIsDistanceDialogOpen(true)
                }}
              >
                AutoSched
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsSaveDialogOpen(true)}
                disabled={
                  !departure ||
                  !selectedOrg ||
                  !Object.entries(columns).some(
                    ([columnId, column]) => columnId !== "jobOrders" && column.jobOrders.length > 0,
                  )
                }
              >
                Save
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="outline" onClick={handleLocationTracking}>
                {isTracking ? "Untrack" : "Track"}
              </Button>
              <div className="flex items-center">
                <div
                  className={`w-24 h-8 flex items-center justify-center rounded-md text-white ${
                    isTracking ? "bg-green-500" : "bg-red-500"
                  }`}
                >
                  {isTracking ? (
                    <span className="relative">
                      Tracking
                      <span
                        className={`absolute left-full animate-pulse opacity-0 ${isTracking ? "inline-block" : "hidden"}`}
                      >
                        ...
                      </span>
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
          <div className="space-y-2 rounded-lg bg-muted/50 p-4">
            <button
              className="flex w-full items-center justify-between"
              onClick={() => setIsDepartureExpanded(!isDepartureExpanded)}
            >
              <span className="font-medium">Departure:</span>
              {isDepartureExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {isDepartureExpanded && (
              <>
                <div>
                  <span className="font-medium">Date/Time:</span>{" "}
                  <span className="text-muted-foreground">
                    {format(departure.datetime, "PPP")} at {format(departure.datetime, "p")}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Location:</span>{" "}
                  <span className="text-muted-foreground">{departure.location.address}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {departure.location.city}, {departure.location.state} {departure.location.postCode},{" "}
                  {departure.location.country}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex-grow overflow-hidden">
        {selectedEmployees.length === 0 || selectedJobOrders.length === 0 ? (
          <div className="flex h-full items-center justify-center p-8 text-center text-muted-foreground">
            Please select employees and job orders to start scheduling
          </div>
        ) : (
          <KanbanBoard
            employees={selectedEmployees}
            jobOrders={selectedJobOrders}
            columns={columns}
            onColumnsChange={setColumns}
            depot={departure?.location}
            userRole={userRole}
          />
        )}
      </div>

      <LoadingDialog isOpen={isAutoScheduling || isSaving} message="Loading..." />
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

