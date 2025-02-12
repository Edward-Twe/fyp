"use client"

import type React from "react"
import { useEffect, useState, useRef } from "react"
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd"
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import type { Employees } from "@prisma/client"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion"
import type { JobOrderWithTasks, Columns, Column, Location } from "@/app/types/routing"
import { Button } from "@/components/ui/button"
import { Map, Route } from "lucide-react"
import { BoardMapDialog } from "./board-map-dialog"
import type { LocationDetails } from "./DepartureDialog"
import { optimizeRoute } from "@/app/(main)/schedule/utils/route-optimizing"
import { LoadingDialog } from "@/components/LoadingDialog"
import { cn } from "@/lib/utils"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"

interface KanbanBoardProps {
  employees: Employees[]
  jobOrders: JobOrderWithTasks[]
  columns?: Columns
  onColumnsChange?: (newColumns: Columns) => void
  depot?: LocationDetails
}

const SCROLL_SPEED = 15
const SCROLL_THRESHOLD = 150

export default function KanbanBoard({
  employees,
  jobOrders,
  columns: initialColumns,
  onColumnsChange,
  depot,
}: KanbanBoardProps) {
  const [columns, setColumns] = useState<Columns>({})
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollIntervalRef = useRef<NodeJS.Timeout>()
  const [selectedEmployee, setSelectedEmployee] = useState<{
    name: string
    id: string
    jobOrders: JobOrderWithTasks[]
  } | null>(null)
  const [isOptimizing, setIsOptimizing] = useState(false)

  useEffect(() => {
    if (initialColumns && Object.keys(initialColumns).length > 0) {
      setColumns(initialColumns)
    } else if (jobOrders.length > 0) {
      const newColumns: Columns = {
        jobOrders: {
          id: "jobOrders",
          title: "Job Orders",
          jobOrders: jobOrders,
        },
      }

      if (employees.length > 0) {
        employees.forEach((employee) => {
          newColumns[employee.id] = {
            id: employee.id,
            title: employee.name,
            jobOrders: [],
          }
        })
      }

      setColumns(newColumns)
    }
  }, [employees, jobOrders, initialColumns])

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

  const handleMapClick = (employeeName: string, columnId: string, column: Column) => {
    if (column.jobOrders.length > 0 && depot) {
      setSelectedEmployee({
        name: employeeName,
        id: columnId,
        jobOrders: column.jobOrders,
      })
    }
  }

  const handleOptimizeRoute = async (columnId: string, column: Column) => {
    if (column.jobOrders.length > 0 && depot) {
      try {
        setIsOptimizing(true)
        const locations = column.jobOrders.map(order => ({
          lat: Number(order.latitude),
          lng: Number(order.longitude),
          placeId: order.placeId,
        }));

        const depotLocation: Location = {
          lat: Number(depot.latitude),
          lng: Number(depot.longitude),
          placeId: depot.placeId
        };

        const result = await optimizeRoute(locations, depotLocation);
        
        if (!result.error) {
          const optimizedJobOrders = result.locations.map(
            location => column.jobOrders.find(
              order => order.placeId === location.placeId
            )!
          );

          const newColumns = {
            ...columns,
            [columnId]: {
              ...column,
              jobOrders: optimizedJobOrders,
            },
          };

          setColumns(newColumns);
          onColumnsChange?.(newColumns);
        }
      } catch (error) {
        console.error("Error optimizing route:", error);
      } finally {
        setIsOptimizing(false);
      }
    }
  };

  const calculateSpaceUsed = (jobOrders: JobOrderWithTasks[]): number => {
    return jobOrders.reduce((sum, order) => sum + Number(order.spaceRequried), 0);
  };

  return (
    <>
      <div className="flex h-full w-full flex-col overflow-hidden p-4">
        <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
          <div
            ref={containerRef}
            className="flex flex-1 gap-4 overflow-x-auto overflow-y-hidden"
            onDragOver={handleScroll}
            style={{ scrollBehavior: "smooth" }}
          >
            {Object.values(columns).map((column) => (
              <div key={column.id} className="w-[300px] flex-shrink-0">
                <Card className="flex h-full flex-col">
                  <CardHeader className="flex-shrink-0 border-b py-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {column.id !== "jobOrders" ? (
                          <>
                            <HoverCard>
                              <HoverCardTrigger>
                                <h3 className="text-lg font-semibold cursor-help">
                                  {column.title}
                                </h3>
                              </HoverCardTrigger>
                              <HoverCardContent>
                                <div className="space-y-2">
                                  <p className="text-sm">
                                    <span className="font-medium">Area:</span>{" "}
                                    {employees.find(emp => emp.id === column.id)?.area || "N/A"}
                                  </p>
                                </div>
                              </HoverCardContent>
                            </HoverCard>
                            {column.id !== "jobOrders" && (
                              <span className={cn(
                                "text-sm px-2 py-1 rounded",
                                calculateSpaceUsed(column.jobOrders) >= Number(employees.find(emp => emp.id === column.id)?.space || 0)
                                  ? "bg-red-100 text-red-700"
                                  : "bg-green-100 text-green-700"
                              )}>
                                {calculateSpaceUsed(column.jobOrders)}/
                                {employees.find(emp => emp.id === column.id)?.space.toString()}
                              </span>
                            )}
                          </>
                        ) : (
                          <h3 className="text-lg font-semibold">{column.title}</h3>
                        )}
                      </div>
                      {column.id !== "jobOrders" && (
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOptimizeRoute(column.id, column)}
                            disabled={column.jobOrders.length === 0 || !depot}
                          >
                            <Route className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMapClick(column.title, column.id, column)}
                            disabled={column.jobOrders.length === 0 || !depot}
                          >
                            <Map className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
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
                            <Draggable key={order.id} draggableId={order.id} index={index}>
                              {(provided) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className="mb-2 rounded bg-secondary p-2 shadow"
                                >
                                  <div key={order.id}>
                                    <Accordion type="single" collapsible>
                                      <AccordionItem value={order.id}>
                                        <div className="flex w-full items-center justify-between">
                                          <div>
                                            <h4 className="text-sm font-semibold">Order #{order.orderNumber}</h4>
                                            <p className="text-xs text-gray-500">{order.address}</p>
                                            <span className="text-xs text-muted-foreground">
                                              Space: {order.spaceRequried.toString()}
                                            </span>
                                          </div>
                                          <AccordionTrigger className="text-right">
                                            {/* AccordionTrigger content goes here */}
                                          </AccordionTrigger>
                                        </div>
                                        <AccordionContent>
                                          <div className="mt-2 space-y-2">
                                            <h5 className="text-xs font-medium">Tasks:</h5>
                                            <ul className="list-inside list-disc text-xs">
                                              {order.JobOrderTask.map((jobOrderTask) => (
                                                <li key={jobOrderTask.id}>
                                                  {jobOrderTask.task.task} - Quantity: {jobOrderTask.quantity}
                                                  <span className="ml-2 text-gray-500">
                                                    ({jobOrderTask.task.requiredTimeValue.toString()}{" "}
                                                    {jobOrderTask.task.requiredTimeUnit})
                                                  </span>
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
            ))}
          </div>
        </DragDropContext>

        {selectedEmployee && depot && (
          <BoardMapDialog
            isOpen={true}
            onClose={() => setSelectedEmployee(null)}
            jobOrders={selectedEmployee.jobOrders}
            depot={depot}
            employeeName={selectedEmployee.name}
            columnId={selectedEmployee.id}
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
          />
        )}
      </div>
      <LoadingDialog isOpen={isOptimizing} message="Optimizing route..." />
    </>
  )
}

