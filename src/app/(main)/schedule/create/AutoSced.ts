'use server'

import { kMeansClustering } from "./clustering"
import { optimizeRoute } from "./route-optimizing"
import { JobOrders, Employees } from "@prisma/client"
import { OptimizationResult, Location, Assignment } from "@/app/types/routing"
import { Decimal } from "@prisma/client/runtime/library"

function decimalToNumber(decimal: Decimal | number): number {
  if (decimal instanceof Decimal) {
    return decimal.toNumber()
  }
  return decimal as number
}

export async function optimizeRoutes(
  jobOrders: JobOrders[],
  employees: Employees[],
  depot: Location
): Promise<OptimizationResult> {
  // 1. Cluster job orders based on number of employees
  const clusters = kMeansClustering(jobOrders, employees.length)

  // 2. Create mutable copy of employees to track remaining capacity
  const employeesWithCapacity = employees.map(emp => ({
    ...emp,
    remainingSpace: decimalToNumber(emp.space)
  }))

  // 3. Initialize assignments
  const assignments: Assignment[] = employeesWithCapacity.map(employee => ({
    employeeId: employee.id,
    jobOrders: [] as JobOrders[],
    route: [] as Location[],
    totalDistance: 0
  }))

  // Sort clusters by total space required
  const sortedClusters = [...clusters].sort(
    (a, b) => b.totalSpaceRequired - a.totalSpaceRequired
  )

  // Sort employees by available space
  const sortedEmployees = [...employeesWithCapacity].sort(
    (a, b) => b.remainingSpace - a.remainingSpace
  )

  // First pass: assign whole clusters where possible
  for (const cluster of sortedClusters) {
    const availableEmployee = sortedEmployees.find(
      employee => employee.remainingSpace >= cluster.totalSpaceRequired
    )

    if (availableEmployee) {
      const assignment = assignments.find(a => a.employeeId === availableEmployee.id)
      if (assignment) {
        assignment.jobOrders.push(...cluster.jobOrders)
        availableEmployee.remainingSpace -= cluster.totalSpaceRequired
      }
    }
  }

  // Second pass: assign remaining job orders
  for (const cluster of sortedClusters) {
    const unassignedOrders = cluster.jobOrders.filter(
      order => !assignments.some(a => a.jobOrders.includes(order))
    )

    for (const order of unassignedOrders) {
      const spaceRequired = decimalToNumber(order.spaceRequried)
      const availableEmployee = sortedEmployees.find(
        employee => employee.remainingSpace >= spaceRequired
      )

      if (availableEmployee) {
        const assignment = assignments.find(a => a.employeeId === availableEmployee.id)
        if (assignment) {
          assignment.jobOrders.push(order)
          availableEmployee.remainingSpace -= spaceRequired
        }
      }
    }
  }

  // 5. Optimize route for each assignment
  const optimizedAssignments = await Promise.all(
    assignments.map(async (assignment) => {
      if (assignment.jobOrders.length === 0) {
        return assignment
      }

      const locations = assignment.jobOrders.map(order => ({
        lat: decimalToNumber(order.latitude),
        lng: decimalToNumber(order.longitude)
      }))

      try {
        // Get optimized route using Google Directions API
        const route = await optimizeRoute(locations, depot)
        
        // Calculate total distance using the Haversine formula
        const totalDistance = route.reduce((total, point, index) => {
          if (index === 0) return 0
          const prevPoint = route[index - 1]
          const R = 6371 // Earth's radius in km
          const dLat = (point.lat - prevPoint.lat) * Math.PI / 180
          const dLon = (point.lng - prevPoint.lng) * Math.PI / 180
          const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(prevPoint.lat * Math.PI / 180) * Math.cos(point.lat * Math.PI / 180) * 
            Math.sin(dLon/2) * Math.sin(dLon/2)
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
          return total + (R * c)
        }, 0)

        return {
          ...assignment,
          route,
          totalDistance
        }
      } catch (error) {
        console.error(`Error optimizing route for employee ${assignment.employeeId}:`, error)
        // If route optimization fails, return unoptimized route
        return {
          ...assignment,
          route: [depot, ...locations, depot],
          totalDistance: 0
        }
      }
    })
  )

  return { assignments: optimizedAssignments }
}