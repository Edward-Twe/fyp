"use client"

import React, { useEffect, useState, useRef } from "react"
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd"
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { motion, AnimatePresence } from "framer-motion"
import { Employees, JobOrders, JobOrderTask, Tasks } from "@prisma/client"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./ui/accordion"

type JobOrderWithTasks = JobOrders & {
  JobOrderTask: (JobOrderTask & {
    task: Tasks
  })[]
}

interface Column {
  id: string
  title: string
  jobOrders: JobOrderWithTasks[]
}

interface Columns {
  [key: string]: Column
}

interface KanbanBoardProps {
  employees: Employees[]
  jobOrders: JobOrderWithTasks[]
}

const SCROLL_SPEED = 15
const SCROLL_THRESHOLD = 150

export default function KanbanBoard({
  employees,
  jobOrders,
}: KanbanBoardProps) {
  const [columns, setColumns] = useState<Columns>({})
  const [ripple, setRipple] = useState("")
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollIntervalRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    if (jobOrders.length > 0) {
      const initialColumns: Columns = {
        jobOrders: {
          id: "jobOrders",
          title: "Job Orders",
          jobOrders: jobOrders,
        },
      }

      if (employees.length > 0) {
        const employeeColumns: Columns = employees.reduce((acc, employee) => {
          acc[employee.id] = {
            id: employee.id,
            title: employee.name,
            jobOrders: [],
          }
          return acc
        }, {} as Columns)

        setColumns({
          ...initialColumns,
          ...employeeColumns,
        })
      } else {
        setColumns(initialColumns)
      }
    }
  }, [employees, jobOrders])

  const handleScroll = (e: React.DragEvent<HTMLDivElement>) => {
    if (!isDragging || !containerRef.current) return

    const container = containerRef.current
    const { clientX, clientY } = e
    const { left, right } = container.getBoundingClientRect()
    
    // Clear any existing scroll interval
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current)
    }

    // Horizontal scrolling
    if (clientX < left + SCROLL_THRESHOLD) {
      scrollIntervalRef.current = setInterval(() => {
        container.scrollLeft -= SCROLL_SPEED
      }, 16)
    } else if (clientX > right - SCROLL_THRESHOLD) {
      scrollIntervalRef.current = setInterval(() => {
        container.scrollLeft += SCROLL_SPEED
      }, 16)
    }

    // Vertical scrolling for the column content
    const columns = container.getElementsByClassName('column-content')
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

    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return
    }

    setColumns((prevColumns) => {
      const sourceColumn = prevColumns[source.droppableId]
      const destColumn = prevColumns[destination.droppableId]

      const sourceTasks = Array.from(sourceColumn.jobOrders)
      const destTasks =
        source.droppableId === destination.droppableId
          ? sourceTasks
          : Array.from(destColumn.jobOrders)

      const [removed] = sourceTasks.splice(source.index, 1)
      destTasks.splice(destination.index, 0, removed)

      return {
        ...prevColumns,
        [source.droppableId]: {
          ...sourceColumn,
          jobOrders: sourceTasks,
        },
        [destination.droppableId]: {
          ...destColumn,
          jobOrders: destTasks,
        },
      }
    })

    setRipple(destination.droppableId)
  }

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      <h2 className="text-2xl font-bold p-4">Kanban Board</h2>
      <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div 
          ref={containerRef}
          className="flex gap-4 overflow-x-auto overflow-y-hidden flex-1"
          onDragOver={handleScroll}
          style={{ scrollBehavior: 'smooth' }}
        >
          {Object.values(columns).map((column) => (
            <div 
              key={column.id} 
              className="flex-shrink-0 w-[300px]"
            >
              <Card className="h-full flex flex-col">
                <AnimatePresence>
                  {ripple === column.id && (
                    <motion.div
                      className="pointer-events-none absolute inset-0 rounded-lg bg-primary"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: [0, 0.2, 0] }}
                      transition={{ duration: 0.4, times: [0, 0.1, 1] }}
                      onAnimationComplete={() => setRipple("")}
                    />
                  )}
                </AnimatePresence>
                <CardHeader className="flex-shrink-0 border-b py-2">
                  <h3 className="text-lg font-semibold">{column.title}</h3>
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
                          >
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
                                      <AccordionTrigger className="text-left">
                                        <div>
                                          <h4 className="text-sm font-semibold">
                                            Order #{order.orderNumber}
                                          </h4>
                                          <p className="text-xs text-gray-500">
                                            {order.address}
                                          </p>
                                        </div>
                                      </AccordionTrigger>
                                      <AccordionContent>
                                        <div className="mt-2 space-y-2">
                                          <h5 className="text-xs font-medium">Tasks:</h5>
                                          <ul className="list-inside list-disc text-xs">
                                            {order.JobOrderTask.map(
                                              (jobOrderTask) => (
                                                <li key={jobOrderTask.id}>
                                                  {jobOrderTask.task.task} - Quantity:{" "}
                                                  {jobOrderTask.quantity}
                                                  <span className="ml-2 text-gray-500">
                                                    ({jobOrderTask.task.requiredTimeValue.toString()}{" "}
                                                    {jobOrderTask.task.requiredTimeUnit})
                                                  </span>
                                                </li>
                                              )
                                            )}
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
    </div>
  )
}

