"use client"

import type React from "react"
import { useEffect, useState, useRef } from "react"
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd"
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import type { Employees, Roles } from "@prisma/client"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion"
import type { JobOrderWithTasks, Columns, Column, Location } from "@/app/types/routing"
import { Button } from "@/components/ui/button"
import { Map, Route, Clock, Package, User } from "lucide-react"
import { BoardMapDialog } from "./board-map-dialog"
import type { LocationDetails } from "./DepartureDialog"
import { optimizeRoute } from "@/app/(main)/schedule/utils/route-optimizing"
import { LoadingDialog } from "@/components/LoadingDialog"
import { cn } from "@/lib/utils"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Status } from "@prisma/client"
import { updateJobOrderStatus } from "@/app/(main)/schedule/edit/[id]/action"
import { useToast } from "@/components/hooks/use-toast"
import { format } from "date-fns"

interface KanbanBoardProps {
  employees: Employees[]
  jobOrders: JobOrderWithTasks[]
  columns?: Columns
  onColumnsChange?: (newColumns: Columns) => void
  depot?: LocationDetails
  userRole: Roles | null
  orgId: string
}

const SCROLL_SPEED = 15
const SCROLL_THRESHOLD = 150

const statusStyles: Record<Status, string> = {
  todo: "text-red-600 bg-red-100 dark:text-red-300 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-800/30",
  inprogress:
    "text-yellow-600 bg-yellow-100 dark:text-yellow-300 dark:bg-yellow-900/30 hover:bg-yellow-200 dark:hover:bg-yellow-800/30",
  completed:
    "text-green-600 bg-green-100 dark:text-green-300 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-800/30",
  unscheduled: "",
} as const

export default function KanbanBoard({
  employees,
  jobOrders,
  columns: initialColumns,
  onColumnsChange,
  depot,
  userRole,
  orgId,
}: KanbanBoardProps) {
  const [columns, setColumns] = useState<Columns>({})
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollIntervalRef = useRef<NodeJS.Timeout>()
  const [selectedEmployee, setSelectedEmployee] = useState<{
    name: string
    id: string
    jobOrders: JobOrderWithTasks[]
    currentLat: number
    currentLng: number
    lastUpdatedAt: Date | null
  } | null>(null)
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (initialColumns && Object.keys(initialColumns).length > 0) {
      // Create a deep copy of initialColumns with sorted job orders
      const deepCopiedColumns = Object.keys(initialColumns).reduce((acc, key) => {
        acc[key] = {
          ...initialColumns[key],
          // Create a new array for job orders and ensure they're sorted
          jobOrders: [...initialColumns[key].jobOrders].sort(
            (a, b) => (a.scheduledOrder || 0) - (b.scheduledOrder || 0)
          )
        };
        return acc;
      }, {} as Columns);
      
      setColumns(deepCopiedColumns);
    } else if (jobOrders.length > 0) {
      const newColumns: Columns = {
        ...(userRole === "owner" || userRole === "admin"
          ? {
              jobOrders: {
                id: "jobOrders",
                title: "Job Orders",
                jobOrders: [...jobOrders],
              },
            }
          : {}),
      }

      if (employees.length > 0) {
        employees.forEach((employee) => {
          newColumns[employee.id] = {
            id: employee.id,
            title: employee.name,
            jobOrders: [],
            currentLat: employee.currentLat ? Number(employee.currentLat) : 1000,
            currentLng: employee.currentLong ? Number(employee.currentLong) : 1000,
            lastUpdatedAt: employee.lastUpdatedAt ? employee.lastUpdatedAt : null,
          }
        })
      }

      setColumns(newColumns)
    }
  }, [employees, jobOrders, initialColumns, userRole])
  

  const handleScroll = (e: React.DragEvent<HTMLDivElement>) => {
    if (!isDragging || !containerRef.current) return

    const container = containerRef.current
    const { clientX, clientY } = e
    const { left, right } = container.getBoundingClientRect()

    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current)
    }

    if (clientX < left + SCROLL_THRESHOLD) {
      scrollIntervalRef.current = setInterval(() => {
        container.scrollLeft -= SCROLL_SPEED
      }, 16)
    } else if (clientX > right - SCROLL_THRESHOLD) {
      scrollIntervalRef.current = setInterval(() => {
        container.scrollLeft += SCROLL_SPEED
      }, 16)
    }

    const columns = container.getElementsByClassName("column-content")
    for (const column of columns) {
      const rect = column.getBoundingClientRect()
      if (clientX >= rect.left && clientX <= rect.right) {
        if (clientY < rect.top + SCROLL_THRESHOLD) {
          scrollIntervalRef.current = setInterval(() => {
            column.scrollTop -= SCROLL_SPEED
          }, 16)
        } else if (clientY > rect.bottom - SCROLL_THRESHOLD) {
          scrollIntervalRef.current = setInterval(() => {
            column.scrollTop += SCROLL_SPEED
          }, 16)
        }
        break
      }
    }
  }

  const onDragStart = () => {
    setIsDragging(true)
  }

  const onDragEnd = (result: DropResult) => {
    if (userRole !== "owner" && userRole !== "admin") return
    setIsDragging(false)
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current)
    }

    const { source, destination } = result

    if (!destination) return

    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return
    }

    const newColumns = { ...columns }
    const sourceColumn = newColumns[source.droppableId]
    const destColumn = newColumns[destination.droppableId]

    const sourceTasks = Array.from(sourceColumn.jobOrders)
    const destTasks = source.droppableId === destination.droppableId ? sourceTasks : Array.from(destColumn.jobOrders)

    const [removed] = sourceTasks.splice(source.index, 1)
    destTasks.splice(destination.index, 0, removed)

    newColumns[source.droppableId] = {
      ...sourceColumn,
      jobOrders: sourceTasks,
    }
    newColumns[destination.droppableId] = {
      ...destColumn,
      jobOrders: destTasks,
    }

    setColumns(newColumns)
    // Only notify parent of changes after drag operations
    onColumnsChange?.(newColumns)
  }

  const handleMapClick = (
    employeeName: string,
    currentLat: number | undefined,
    currentLng: number | undefined,
    lastUpdatedAt: Date | null | undefined,
    columnId: string,
    column: Column,
  ) => {
    if (column.jobOrders.length > 0 && depot) {
      setSelectedEmployee({
        name: employeeName,
        id: columnId,
        jobOrders: column.jobOrders,
        currentLat: currentLat ? Number(currentLat) : 1000,
        currentLng: currentLng ? Number(currentLng) : 1000,
        lastUpdatedAt: lastUpdatedAt ? lastUpdatedAt : null,
      })
    }
  }

  const handleOptimizeRoute = async (columnId: string, column: Column) => {
    if (column.jobOrders.length > 0 && depot) {
      try {
        setIsOptimizing(true)
        const locations = column.jobOrders.map((order) => ({
          lat: Number(order.latitude),
          lng: Number(order.longitude),
          placeId: order.placeId,
        }))

        const depotLocation: Location = {
          lat: Number(depot.latitude),
          lng: Number(depot.longitude),
          placeId: depot.placeId,
        }

        const result = await optimizeRoute(locations, depotLocation)

        if (!result.error) {
          const optimizedJobOrders = result.locations.map(
            (location) => column.jobOrders.find((order) => order.placeId === location.placeId)!,
          )

          const newColumns = {
            ...columns,
            [columnId]: {
              ...column,
              jobOrders: optimizedJobOrders,
            },
          }

          setColumns(newColumns)
          onColumnsChange?.(newColumns)
        }
      } catch (error) {
        console.error("Error optimizing route:", error)
      } finally {
        setIsOptimizing(false)
      }
    }
  }

  const calculateSpaceUsed = (jobOrders: JobOrderWithTasks[]): number => {
    return jobOrders.reduce((sum, order) => sum + Number(order.spaceRequried), 0)
  }

  // Function to get column class based on index
  const getColumnBackgroundClass = (index: number): string => {
    const colorIndex = index % 8
    switch (colorIndex) {
      case 0:
        return "bg-gradient-to-b from-blue-100 to-blue-50 dark:from-blue-900/30 dark:to-blue-950/20"
      case 1:
        return "bg-gradient-to-b from-indigo-100 to-indigo-50 dark:from-indigo-900/30 dark:to-indigo-950/20"
      case 2:
        return "bg-gradient-to-b from-sky-100 to-sky-50 dark:from-sky-900/30 dark:to-sky-950/20"
      case 3:
        return "bg-gradient-to-b from-cyan-100 to-cyan-50 dark:from-cyan-900/30 dark:to-cyan-950/20"
      case 4:
        return "bg-gradient-to-b from-teal-100 to-teal-50 dark:from-teal-900/30 dark:to-teal-950/20"
      case 5:
        return "bg-gradient-to-b from-blue-100 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-950/20"
      case 6:
        return "bg-gradient-to-b from-sky-100 to-blue-50 dark:from-sky-900/30 dark:to-blue-950/20"
      case 7:
        return "bg-gradient-to-b from-indigo-100 to-sky-50 dark:from-indigo-900/30 dark:to-sky-950/20"
      default:
        return "bg-gradient-to-b from-blue-100 to-blue-50 dark:from-blue-900/30 dark:to-blue-950/20"
    }
  }

  const handleStatusChange = async (order: JobOrderWithTasks, newStatus: Status) => {
    setLoading(true);
    const updatedOrder = {
        ...order,
        status: newStatus,
    };

    const result = await updateJobOrderStatus(order.id, order.orderNumber, newStatus, orgId, order.employeeId!, userRole!);
    setLoading(false);

    if (result.error) {
        console.error(result.error);
        toast({
            variant: "destructive",
            title: "Error",
            description: result.error,
        });
    } else {

        const newColumns = { ...columns };
        const columnId = Object.keys(columns).find((id) =>
            columns[id].jobOrders.some((jo) => jo.id === order.id),
        );

        if (columnId) {
            newColumns[columnId].jobOrders = newColumns[columnId].jobOrders.map((jo) =>
                jo.id === order.id ? updatedOrder : jo,
            );

            setColumns(newColumns);
            onColumnsChange?.(newColumns);
            toast({
                title: "Success",
                description: "Job order status updated successfully!",
            });
        }
    }
  };

  return (
    <>
      <div className="flex h-full w-full flex-col overflow-hidden p-4">
        <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
          <div
            ref={containerRef}
            className="flex flex-1 gap-4 overflow-x-auto overflow-y-auto md:flex-row flex-col"
            onDragOver={handleScroll}
            style={{ scrollBehavior: "smooth" }}
          >
            {Object.values(columns).map(
              (column, index) =>
                (column.id !== "jobOrders" || userRole === "owner" || userRole === "admin") && (
                  <div key={column.id} className="w-full md:w-[320px] flex-shrink-0 mb-4 md:mb-0">
                    <Card
                      className={cn(
                        "flex h-full min-h-[300px] md:min-h-0 flex-col border-transparent shadow-md",
                        column.id === "jobOrders" ? "bg-white/80 dark:bg-gray-800/80" : getColumnBackgroundClass(index),
                      )}
                    >
                      <CardHeader className="flex-shrink-0 border-b py-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {column.id !== "jobOrders" ? (
                              <>
                                <div className="flex items-center gap-2">
                                  <User className="h-5 w-5 text-theme-blue-500" />
                                  <HoverCard>
                                    <HoverCardTrigger>
                                      <h3 className="cursor-help text-lg font-semibold">{column.title}</h3>
                                    </HoverCardTrigger>
                                    <HoverCardContent>
                                      <div className="space-y-2">
                                        <p className="text-sm">
                                          <span className="font-medium">Area:</span>{" "}
                                          {employees.find((emp) => emp.id === column.id)?.area || "N/A"}
                                        </p>
                                        {column.lastUpdatedAt && (
                                          <p className="text-sm">
                                            <span className="font-medium">Last Updated:</span>{" "}
                                            {format(new Date(column.lastUpdatedAt), "PPp")}
                                          </p>
                                        )}
                                      </div>
                                    </HoverCardContent>
                                  </HoverCard>
                                </div>
                                {column.id !== "jobOrders" && (
                                  <span
                                    className={cn(
                                      "rounded-full px-2 py-1 text-xs font-medium",
                                      calculateSpaceUsed(column.jobOrders) >=
                                        Number(employees.find((emp) => emp.id === column.id)?.space || 0)
                                        ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                                        : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
                                    )}
                                  >
                                    {calculateSpaceUsed(column.jobOrders)}/
                                    {employees.find((emp) => emp.id === column.id)?.space.toString()}
                                  </span>
                                )}
                              </>
                            ) : (
                              <div className="flex items-center gap-2">
                                <Package className="h-5 w-5 text-theme-blue-500" />
                                <h3 className="text-lg font-semibold">{column.title}</h3>
                              </div>
                            )}
                          </div>
                          {column.id !== "jobOrders" && (
                            <div className="flex gap-2">
                              {(userRole === "owner" || userRole === "admin") && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="hover:bg-theme-blue-100 dark:hover:bg-theme-blue-900/30"
                                  onClick={() => handleOptimizeRoute(column.id, column)}
                                  disabled={column.jobOrders.length === 0 || !depot}
                                >
                                  <Route className="h-4 w-4 text-theme-blue-500" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="hover:bg-theme-blue-100 dark:hover:bg-theme-blue-900/30"
                                onClick={() =>
                                  handleMapClick(
                                    column.title,
                                    column.currentLat,
                                    column.currentLng,
                                    column.lastUpdatedAt,
                                    column.id,
                                    column,
                                  )
                                }
                                disabled={column.jobOrders.length === 0 || !depot}
                              >
                                <Map className="h-4 w-4 text-theme-blue-500" />
                              </Button>
                            </div>
                          )}
                        </div>
                        {column.totalDistance !== undefined && (
                          <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Route className="h-3 w-3" />
                              <span>{column.totalDistance.toFixed(1)} km</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span>{column.totalTime?.toFixed(0)} min</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Package className="h-3 w-3" />
                              <span>{column.totalOrders} orders</span>
                            </div>
                          </div>
                        )}
                      </CardHeader>
                      <CardContent className="flex-grow overflow-hidden p-0">
                        <Droppable droppableId={column.id}>
                          {(provided) => (
                            <div
                              {...provided.droppableProps}
                              ref={provided.innerRef}
                              className="column-content h-full overflow-y-auto p-2"
                            >
                              {column.jobOrders.map((order, index) => (
                                <Draggable
                                  key={order.id}
                                  draggableId={order.id}
                                  index={index}
                                  isDragDisabled={userRole !== "owner" && userRole !== "admin"}
                                >
                                  {(provided) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      className="mb-3 rounded-lg border border-transparent bg-gradient-to-r from-blue-50 to-indigo-50 p-3 shadow-md transition-all duration-300 hover:border-theme-blue-300 hover:shadow-lg dark:from-blue-900/20 dark:to-indigo-900/20 dark:hover:border-theme-blue-500"
                                    >
                                      <div key={order.id}>
                                        <Accordion type="single" collapsible>
                                          <AccordionItem value={order.id} className="border-none">
                                            <div className="flex w-full items-center justify-between">
                                              <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                  <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                                                    Order #{order.orderNumber}
                                                  </h4>
                                                  <span
                                                    className={cn(
                                                      "status-badge",
                                                      order.status === "todo"
                                                        ? "status-badge-todo"
                                                        : order.status === "inprogress"
                                                          ? "status-badge-inprogress"
                                                          : "status-badge-completed",
                                                    )}
                                                  >
                                                    {order.status || "todo"}
                                                  </span>
                                                </div>
                                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                                  {order.address}
                                                </p>
                                                <div className="flex flex-wrap gap-2 pt-1">
                                                  <span className="inline-flex items-center rounded-md bg-theme-blue-50 px-2 py-0.5 text-xs font-medium text-theme-blue-700 dark:bg-theme-blue-900/30 dark:text-theme-blue-300">
                                                    Space: {order.spaceRequried.toString()}
                                                  </span>
                                                  {order.updatedBy && (
                                                    <span className="inline-flex items-center rounded-md bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                                                      Updated by: {order.updatedBy}
                                                    </span>
                                                  )}
                                                </div>
                                              </div>
                                              <div className="flex items-center gap-2">
                                                <DropdownMenu>
                                                  <DropdownMenuTrigger asChild>
                                                    <Button
                                                      variant="ghost"
                                                      size="sm"
                                                      className={cn(
                                                        "rounded-md px-2 py-1",
                                                        statusStyles[order.status as Status] || statusStyles.todo,
                                                      )}
                                                    >
                                                      {order.status || "todo"}
                                                    </Button>
                                                  </DropdownMenuTrigger>
                                                  <DropdownMenuContent align="end">
                                                    <DropdownMenuItem
                                                      className={statusStyles.todo}
                                                      onClick={async () => {
                                                        await handleStatusChange(order, Status.todo)
                                                      }}
                                                    >
                                                      To-do
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                      className={statusStyles.inprogress}
                                                      onClick={async () => {
                                                        await handleStatusChange(order, Status.inprogress)
                                                      }}
                                                    >
                                                      In Progress
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                      className={statusStyles.completed}
                                                      onClick={async () => {
                                                        await handleStatusChange(order, Status.completed)
                                                      }}
                                                    >
                                                      Completed
                                                    </DropdownMenuItem>
                                                  </DropdownMenuContent>
                                                </DropdownMenu>
                                                <AccordionTrigger className="text-right hover:no-underline">
                                                  {/* AccordionTrigger content */}
                                                </AccordionTrigger>
                                              </div>
                                            </div>
                                            <AccordionContent>
                                              <div className="mt-3 space-y-2 rounded-md bg-white/50 p-2 dark:bg-gray-800/50">
                                                <h5 className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                                  Tasks:
                                                </h5>
                                                <ul className="grid gap-1.5">
                                                  {order.JobOrderTask.map((jobOrderTask) => (
                                                    <li
                                                      key={jobOrderTask.id}
                                                      className="flex items-start gap-2 text-xs"
                                                    >
                                                      <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-theme-blue-400 dark:bg-theme-blue-600"></span>
                                                      <div>
                                                        <span className="font-medium">{jobOrderTask.task.task}</span>
                                                        <span className="ml-1 text-gray-500">
                                                          - Quantity: {jobOrderTask.quantity}
                                                        </span>
                                                        <span className="ml-2 text-gray-500">
                                                          ({jobOrderTask.task.requiredTimeValue.toString()}{" "}
                                                          {jobOrderTask.task.requiredTimeUnit})
                                                        </span>
                                                      </div>
                                                    </li>
                                                  ))}
                                                </ul>
                                              </div>
                                            </AccordionContent>
                                          </AccordionItem>
                                        </Accordion>
                                      </div>
                                    </div>
                                  )}
                                </Draggable>
                              ))}
                              {provided.placeholder}
                            </div>
                          )}
                        </Droppable>
                      </CardContent>
                    </Card>
                  </div>
                ),
            )}
          </div>
        </DragDropContext>

        {selectedEmployee && depot && (
          <BoardMapDialog
            isOpen={true}
            onClose={() => setSelectedEmployee(null)}
            jobOrders={selectedEmployee.jobOrders}
            depot={depot}
            employeeName={selectedEmployee.name}
            employeeId={selectedEmployee.id}
            columnId={selectedEmployee.id}
            currentLat={selectedEmployee.currentLat}
            currentLng={selectedEmployee.currentLng}
            lastUpdatedAt={selectedEmployee.lastUpdatedAt}
            onJobOrdersChange={(columnId, updatedJobOrders) => {
              const newColumns = {
                ...columns,
                [columnId]: {
                  ...columns[columnId],
                  jobOrders: updatedJobOrders,
                },
              }
              setColumns(newColumns)
              onColumnsChange?.(newColumns)
            }}
            userRole={userRole}
          />
        )}
      </div>
      <LoadingDialog isOpen={isOptimizing} message="Optimizing route..." />
      <LoadingDialog isOpen={loading} message="Updating job order status..." />
    </>
  )
}

