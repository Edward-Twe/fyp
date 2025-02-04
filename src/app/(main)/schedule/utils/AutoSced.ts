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

  const calculateCentroid = (jobOrders: JobOrders[]) => {
    const total = jobOrders.reduce(
      (acc, order) => {
        acc.lat += Number(order.latitude)
        acc.lng += Number(order.longitude)
        return acc
      },
      { lat: 0, lng: 0 }
    )
    const count = jobOrders.length
    return {
      lat: total.lat / count,
      lng: total.lng / count,
    }
  }

  const cluster1JobOrders = cluster.jobOrders.slice(0, midPoint)
  const cluster2JobOrders = cluster.jobOrders.slice(midPoint)

  const cluster1 = {
    ...cluster,
    id: cluster.id * 2,
    jobOrders: cluster1JobOrders,
    totalSpaceRequired: cluster1JobOrders.reduce(
      (sum, order) => sum + Number(order.spaceRequried),
      0
    ),
    centroid: calculateCentroid(cluster1JobOrders),
  }

  const cluster2 = {
    ...cluster,
    id: cluster.id * 2 + 1,
    jobOrders: cluster2JobOrders,
    totalSpaceRequired: cluster2JobOrders.reduce(
      (sum, order) => sum + Number(order.spaceRequried),
      0
    ),
    centroid: calculateCentroid(cluster2JobOrders),
  }

  return [cluster1, cluster2]
}

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRadians = (degrees: number) => degrees * (Math.PI / 180);

  const R = 6371; // Radius of the Earth in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in kilometers
}

export async function optimizeRoutes(
  jobOrders: JobOrders[],
  employees: Employees[],
  depot: Location,
  maxDistance: number
): Promise<OptimizationResult> {
  try {
    // 1. Cluster job orders based on number of employees and maxDistance
    const clusters = kMeansClusteringD(jobOrders, maxDistance)

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
      // console.log(optimizedClusters);
      const largestCluster = optimizedClusters.shift()
      if (!largestCluster) {
        break
      }
      const splitClusters = splitCluster(largestCluster)
      optimizedClusters.push(...splitClusters)
    }
    // console.log("Clusters after splitting:", optimizedClusters);

    // 6. Initialize assignments
    const assignments: Assignment[] = employeesWithCapacity.map(employee => ({
      employeeId: employee.id,
      jobOrders: [] as JobOrders[],
      route: [] as Location[],
      totalDistance: 0,
      centroid: { lat: 0, lng: 0 }
    }))


    // Add 'jobOrders' assignment for unassigned job orders
    assignments.push({
      employeeId: "jobOrders",
      jobOrders: [] as JobOrders[],
      route: [] as Location[],
      totalDistance: 0,
      centroid: { lat: 0, lng: 0 }
    })

    console.log(employeesWithCapacity)
    // 7. Assign clusters to employees
    optimizedClusters.forEach((cluster) => {
      // Find employee with most remaining space instead of using index
      const employee = employeesWithCapacity
        .filter(emp => emp.remainingSpace >= cluster.totalSpaceRequired)
        .sort((a, b) => b.remainingSpace - a.remainingSpace)[0];

      if (!employee) {
        // If no employee has enough space, add to unassigned
        assignments
          .find((a) => a.employeeId === "jobOrders")!
          .jobOrders.push(...cluster.jobOrders);
        return;
      }

      const assignment = assignments.find((a) => a.employeeId === employee.id)!;

      if (cluster.totalSpaceRequired <= employee.remainingSpace) {
        assignment.jobOrders.push(...cluster.jobOrders);
        assignment.centroid = cluster.centroid;
        employee.remainingSpace -= cluster.totalSpaceRequired;
      } else {
        // Remove job orders from the end until the cluster fits
        while (cluster.totalSpaceRequired > employee.remainingSpace && cluster.jobOrders.length > 0) {
          const removedOrder = cluster.jobOrders.pop()!;
          cluster.totalSpaceRequired -= Number(removedOrder.spaceRequried);
          assignments.find((a) => a.employeeId === "jobOrders")!.jobOrders.push(removedOrder);
        }
        assignment.jobOrders.push(...cluster.jobOrders);
        employee.remainingSpace -= cluster.totalSpaceRequired;
      }
    });

    // 8. Handle unassigned job orders
    const unassignedOrders = assignments.find((a) => a.employeeId === "jobOrders")!.jobOrders;
    unassignedOrders.forEach((order) => {
      let closestAssignment: Assignment | null = null;
      let minDistance = maxDistance + 10;

      assignments.forEach((assignment) => {
        if (assignment.employeeId !== "jobOrders") {
          const distance = calculateDistance(
            assignment.centroid.lat,
            assignment.centroid.lng,
            decimalToNumber(order.latitude),
            decimalToNumber(order.longitude)
          );

          if (
            distance < minDistance &&
            assignment.jobOrders.reduce((sum, o) => sum + Number(o.spaceRequried), 0) + Number(order.spaceRequried) <=
              employeesWithCapacity.find((e) => e.id === assignment.employeeId)!.remainingSpace
          ) {
            minDistance = distance;
            closestAssignment = assignment;
          }
        }
      });

      if (closestAssignment) {
        (closestAssignment as Assignment).jobOrders.push(order);
        const employee = employeesWithCapacity.find((e) => e.id === closestAssignment!.employeeId)!;
        employee.remainingSpace -= Number(order.spaceRequried);

      }
    });

    return {
      assignments: assignments.filter((a) => a.employeeId !== "jobOrders"),
    };
  } catch (error) {
    console.error("Error in route optimization:", error);
    return {
      assignments: [],
      error: "Failed to optimize routes",
    };
  }
}