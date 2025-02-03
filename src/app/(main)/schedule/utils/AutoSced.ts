'use server'

import { kMeansClusteringD } from "./clusteringDistance"
import { optimizeRoute } from "./route-optimizing"
import { JobOrders, Employees } from "@prisma/client"
import { OptimizationResult, Location, Assignment, Cluster } from "@/app/types/routing"
import { Decimal } from "@prisma/client/runtime/library"

function decimalToNumber(decimal: Decimal | number): number {
  if (decimal instanceof Decimal) {
    return decimal.toNumber()
  }
  return decimal as number
}

function splitCluster(cluster: Cluster): Cluster[] {
  const midPoint = Math.floor(cluster.jobOrders.length / 2)
  const cluster1 = {
    ...cluster,
    id: cluster.id * 2,
    jobOrders: cluster.jobOrders.slice(0, midPoint),
    totalSpaceRequired: cluster.jobOrders
      .slice(0, midPoint)
      .reduce((sum, order) => sum + Number(order.spaceRequried), 0),
  }
  const cluster2 = {
    ...cluster,
    id: cluster.id * 2 + 1,
    jobOrders: cluster.jobOrders.slice(midPoint),
    totalSpaceRequired: cluster.jobOrders.slice(midPoint).reduce((sum, order) => sum + Number(order.spaceRequried), 0),
  }
  return [cluster1, cluster2]
}

export async function optimizeRoutes(
  jobOrders: JobOrders[],
  employees: Employees[],
  depot: Location
): Promise<OptimizationResult> {
  try {
    // 1. Cluster job orders based on number of employees
    const clusters = kMeansClusteringD(jobOrders)

    // 2. Optimize route for each cluster
    const optimizedClusters = await Promise.all(
      clusters.map(async (cluster) => {
        const locations = cluster.jobOrders.map((order) => ({
          lat: decimalToNumber(order.latitude),
          lng: decimalToNumber(order.longitude),
          placeId: order.placeId,
        }))
        try {
          const result = await optimizeRoute(locations, depot)
          if (result.error) {
            throw new Error(result.error)
          }

          // optimizedRoute.forEach((location) => {
          //   cluster.jobOrders.forEach((order) => {
          //     console.log("Comparing:", {
          //       orderPlaceId: order.placeId,
          //       routePlaceId: location.placeId,
          //     })
          //   })
          // })
          return {
            ...cluster,
            jobOrders: result.locations.map(
              (location) =>
                cluster.jobOrders.find(
                  (order) => order.placeId === location.placeId
                )!,
            ),
          }
        } catch (error) {
          console.error(`Error optimizing route for cluster ${cluster.id}:`, error)
          throw error
        }
      }),
    )

    // console.log(optimizedClusters)

    // 3. Create mutable copy of employees to track remaining capacity
    const employeesWithCapacity = employees.map(emp => ({
      ...emp,
      remainingSpace: decimalToNumber(emp.space)
    }))

    // 4. Sort clusters and employees
    optimizedClusters.sort((a, b) => b.totalSpaceRequired - a.totalSpaceRequired)
    employeesWithCapacity.sort((a, b) => b.remainingSpace - a.remainingSpace)

    // 5. Split optimized clusters if necessary
    while (optimizedClusters.length < employeesWithCapacity.length) {
      
      optimizedClusters.sort((a, b) => b.totalSpaceRequired - a.totalSpaceRequired)
      console.log(optimizedClusters);
      const largestCluster = optimizedClusters.shift()
      if (!largestCluster) {
        break
      }
      const splitClusters = splitCluster(largestCluster)
      optimizedClusters.push(...splitClusters)
    }
    console.log("Clusters after splitting:", optimizedClusters);

    // 6. Initialize assignments
    const assignments: Assignment[] = employeesWithCapacity.map(employee => ({
      employeeId: employee.id,
      jobOrders: [] as JobOrders[],
      route: [] as Location[],
      totalDistance: 0
    }))

    // Add 'jobOrders' assignment for unassigned job orders
    assignments.push({
      employeeId: "jobOrders",
      jobOrders: [] as JobOrders[],
      route: [] as Location[],
      totalDistance: 0,
    })

    // 7. Assign clusters to employees
    optimizedClusters.forEach((cluster, index) => {
      const employee = employeesWithCapacity[index]
      const assignment = assignments.find((a) => a.employeeId === employee.id)!

      if (cluster.totalSpaceRequired <= employee.remainingSpace) {
        assignment.jobOrders.push(...cluster.jobOrders)
        employee.remainingSpace -= cluster.totalSpaceRequired
      } else {
        // Remove job orders from the end until the cluster fits
        while (cluster.totalSpaceRequired > employee.remainingSpace && cluster.jobOrders.length > 0) {
          const removedOrder = cluster.jobOrders.pop()!
          cluster.totalSpaceRequired -= Number(removedOrder.spaceRequried)
          assignments.find((a) => a.employeeId === "jobOrders")!.jobOrders.push(removedOrder)
        }
        assignment.jobOrders.push(...cluster.jobOrders)
        employee.remainingSpace -= cluster.totalSpaceRequired
      }
    })

    return { 
      assignments: assignments
    };
  } catch (error) {
    console.error("Error in route optimization:", error);
    return { 
      assignments: [],
      error: "Failed to optimize routes"
    };
  }
}