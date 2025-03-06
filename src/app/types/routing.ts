import { JobOrders, JobOrderTask, Tasks } from "@prisma/client"

export interface Location {
  lat: number
  lng: number
  placeId?: string;
}

export interface Cluster {
  id: number
  jobOrders: JobOrders[]
  totalSpaceRequired: number
  centroid: Location
}

export interface Assignment {
  employeeId: string
  jobOrders: JobOrders[]
  route: Location[]
  totalDistance: number
  centroid: Location
}

export interface OptimizationResult {
  assignments: Assignment[];
  error?: string;
}

export type JobOrderWithTasks = JobOrders & {
  JobOrderTask: (JobOrderTask & {
    task: Tasks
  })[]
}

export interface Column {
  id: string
  title: string
  jobOrders: JobOrderWithTasks[]
  totalDistance?: number
  totalTime?: number
  totalSpace?: number
  totalOrders?: number
}

export interface Columns {
  [key: string]: Column
}