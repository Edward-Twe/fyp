'use client'

import React, { useState } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { motion, AnimatePresence } from 'framer-motion'

// Define the structure of a task
interface Task {
  id: string
  content: string
}

// Define the structure of a column
interface Column {
  id: string
  title: string
  tasks: Task[]
}

// Initial state for the Kanban board
const initialColumns: { [key: string]: Column } = {
  todo: {
    id: 'todo',
    title: 'To Do',
    tasks: [
      { id: 'task-1', content: 'Create login page' },
      { id: 'task-2', content: 'Design database schema' },
    ],
  },
  inProgress: {
    id: 'inProgress',
    title: 'In Progress',
    tasks: [
      { id: 'task-3', content: 'Implement user authentication' },
    ],
  },
  done: {
    id: 'done',
    title: 'Done',
    tasks: [
      { id: 'task-4', content: 'Project setup' },
    ],
  },
}

export default function KanbanBoard() {
  const [columns, setColumns] = useState(initialColumns)
  const [ripple, setRipple] = useState('')

  const onDragEnd = (result: DropResult) => {
    const { source, destination } = result

    // If the item was dropped outside of a droppable area
    if (!destination) return

    // If the item was dropped in the same place
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return
    }

    // Find the source and destination columns
    const sourceColumn = columns[source.droppableId]
    const destColumn = columns[destination.droppableId]

    // Create new arrays for the tasks
    const sourceTasks = Array.from(sourceColumn.tasks)
    const destTasks = source.droppableId === destination.droppableId
      ? sourceTasks
      : Array.from(destColumn.tasks)

    // Remove the task from the source column
    const [removed] = sourceTasks.splice(source.index, 1)

    // Insert the task into the destination column
    destTasks.splice(destination.index, 0, removed)

    // Update the state
    setColumns({
      ...columns,
      [source.droppableId]: {
        ...sourceColumn,
        tasks: sourceTasks,
      },
      [destination.droppableId]: {
        ...destColumn,
        tasks: destTasks,
      },
    })

    // Trigger ripple effect immediately
    setRipple(destination.droppableId)
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Kanban Board</h1>
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4">
          {Object.values(columns).map((column) => (
            <div key={column.id} className="flex-1">
              <Card className="relative overflow-hidden">
                <AnimatePresence>
                  {ripple === column.id && (
                    <motion.div
                      className="absolute inset-0 bg-primary rounded-lg pointer-events-none"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: [0, 0.2, 0] }}
                      transition={{ duration: 0.4, times: [0, 0.1, 1] }}
                      onAnimationComplete={() => setRipple('')}
                    />
                  )}
                </AnimatePresence>
                <CardHeader>
                  <h2 className="text-lg font-semibold">{column.title}</h2>
                </CardHeader>
                <CardContent>
                  <Droppable droppableId={column.id}>
                    {(provided) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className="min-h-[200px]"
                      >
                        {column.tasks.map((task, index) => (
                          <Draggable key={task.id} draggableId={task.id} index={index}>
                            {(provided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className="bg-secondary p-2 mb-2 rounded shadow"
                              >
                                {task.content}
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