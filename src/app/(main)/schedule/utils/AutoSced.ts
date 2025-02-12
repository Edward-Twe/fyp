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

const calculateCentroid = (orders: JobOrders[]) => {
  const total = orders.reduce(
    (acc, order) => {
      acc.lat += Number(order.latitude);
      acc.lng += Number(order.longitude);
      return acc;
    },
    { lat: 0, lng: 0 }
  );
  return {
    lat: total.lat / orders.length,
    lng: total.lng / orders.length,
  };
};

// function splitCluster(cluster: Cluster): Cluster[] {
//   const midPoint = Math.floor(cluster.jobOrders.length / 2)

//   const calculateCentroid = (jobOrders: JobOrders[]) => {
//     const total = jobOrders.reduce(
//       (acc, order) => {
//         acc.lat += Number(order.latitude)
//         acc.lng += Number(order.longitude)
//         return acc
//       },
//       { lat: 0, lng: 0 }
//     )
//     const count = jobOrders.length
//     return {
//       lat: total.lat / count,
//       lng: total.lng / count,
//     }
//   }

//   const cluster1JobOrders = cluster.jobOrders.slice(0, midPoint)
//   const cluster2JobOrders = cluster.jobOrders.slice(midPoint)

//   const cluster1 = {
//     ...cluster,
//     id: cluster.id * 2,
//     jobOrders: cluster1JobOrders,
//     totalSpaceRequired: cluster1JobOrders.reduce(
//       (sum, order) => sum + Number(order.spaceRequried),
//       0
//     ),
//     centroid: calculateCentroid(cluster1JobOrders),
//   }

//   const cluster2 = {
//     ...cluster,
//     id: cluster.id * 2 + 1,
//     jobOrders: cluster2JobOrders,
//     totalSpaceRequired: cluster2JobOrders.reduce(
//       (sum, order) => sum + Number(order.spaceRequried),
//       0
//     ),
//     centroid: calculateCentroid(cluster2JobOrders),
//   }

//   return [cluster1, cluster2]
// }

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
        }));
        try {
          const result = await optimizeRoute(locations, depot);
          if (result.error) {
            throw new Error(result.error);
          }
          return {
            ...cluster,
            jobOrders: result.locations.map(
              (location) =>
                cluster.jobOrders.find(
                  (order) => order.placeId === location.placeId
                )!
            ),
          };
        } catch (error) {
          console.error(`Error optimizing route for cluster ${cluster.id}:`, error);
          throw error;
        }
      })
    );

        // console.log(optimizedClusters)

    
    // 3. Split clusters if needed to ensure each employee gets at least one
    while (optimizedClusters.length < employees.length) {
      optimizedClusters.sort((a, b) => b.totalSpaceRequired - a.totalSpaceRequired);
      const largestCluster = optimizedClusters.shift()!;
      const splitClusters = [
        {
          ...largestCluster,
          id: optimizedClusters.length + 1,
          jobOrders: largestCluster.jobOrders.slice(0, Math.floor(largestCluster.jobOrders.length / 2)),
        },
        {
          ...largestCluster,
          id: optimizedClusters.length + 2,
          jobOrders: largestCluster.jobOrders.slice(Math.floor(largestCluster.jobOrders.length / 2)),
        }
      ].map(cluster => ({
        ...cluster,
        totalSpaceRequired: cluster.jobOrders.reduce(
          (sum, order) => sum + Number(order.spaceRequried),
          0
        ),
        centroid: calculateCentroid(cluster.jobOrders),
      }));
      
      optimizedClusters.push(...splitClusters);
      console.log("splitted", optimizedClusters);
    }

    // 4. Check and split clusters that exceed max employee capacity
    const maxEmployeeSpace = Math.max(...employees.map(emp => decimalToNumber(emp.space)));
    let needsResplit = true;
    while (needsResplit) {
      needsResplit = false;
      for (let i = 0; i < optimizedClusters.length; i++) {
        if (optimizedClusters[i].totalSpaceRequired > maxEmployeeSpace) {
          const originalCluster = optimizedClusters[i];
          const newCluster = {
            ...originalCluster,
            id: optimizedClusters.length + 1,
            jobOrders: [] as JobOrders[],
            totalSpaceRequired: 0,
            centroid: { lat: 0, lng: 0 }
          };

          // Remove job orders one by one until original cluster fits
          while (originalCluster.totalSpaceRequired > maxEmployeeSpace && originalCluster.jobOrders.length > 0) {
            const movedOrder = originalCluster.jobOrders.pop()!;
            newCluster.jobOrders.unshift(movedOrder);
            originalCluster.totalSpaceRequired -= Number(movedOrder.spaceRequried);
            newCluster.totalSpaceRequired += Number(movedOrder.spaceRequried);
          }

          // Recalculate centroids for both clusters
          const calculateCentroid = (orders: JobOrders[]) => {
            const total = orders.reduce(
              (acc, order) => {
                acc.lat += Number(order.latitude);
                acc.lng += Number(order.longitude);
                return acc;
              },
              { lat: 0, lng: 0 }
            );
            return {
              lat: total.lat / orders.length,
              lng: total.lng / orders.length,
            };
          };

          originalCluster.centroid = calculateCentroid(originalCluster.jobOrders);
          newCluster.centroid = calculateCentroid(newCluster.jobOrders);

          optimizedClusters.splice(i, 1, originalCluster, newCluster);
          needsResplit = true;
          break;
        }
      }
    }

    // 5. Initialize assignments and employee capacity tracking
    const employeesWithCapacity = employees.map(emp => ({
      ...emp,
      remainingSpace: decimalToNumber(emp.space),
      areaLat: decimalToNumber(Number(emp.areaLat)),
      areaLong: decimalToNumber(Number(emp.areaLong))
    }));


    const assignments: Assignment[] = employeesWithCapacity.map(employee => ({
      employeeId: employee.id,
      jobOrders: [] as JobOrders[],
      route: [] as Location[],
      totalDistance: 0,
      centroid: { lat: 0, lng: 0 }
    }));


    // Add 'jobOrders' assignment for unassigned job orders
    assignments.push({
      employeeId: "jobOrders",
      jobOrders: [] as JobOrders[],
      route: [] as Location[],
      totalDistance: 0,
      centroid: { lat: 0, lng: 0 }
    });

    // 6. First, ensure each employee gets their closest cluster
    const processedClusters = new Set<number>();
    const employeesWithoutCluster = new Set(employeesWithCapacity.map(emp => emp.id));
    const unassignedAssignment = assignments.find(a => a.employeeId === "jobOrders")!;
    // For each employee, find their closest viable cluster
    for (const employee of employeesWithCapacity) {
      if (!employeesWithoutCluster.has(employee.id)) continue;

      // Get all unassigned clusters sorted by distance to this employee
      const availableClusters = optimizedClusters
        .filter(cluster => !processedClusters.has(cluster.id))
        .map(cluster => ({
          cluster,
          distance: calculateDistance(
            employee.areaLat,
            employee.areaLong,
            cluster.centroid.lat,
            cluster.centroid.lng
          )
        }))
        .sort((a, b) => a.distance - b.distance);

      // Find the first cluster and assign what fits
      for (const { cluster } of availableClusters) {
        const assignment = assignments.find(a => a.employeeId === employee.id)!;
        
        if (cluster.totalSpaceRequired <= employee.remainingSpace) {
          // Assign entire cluster
          assignment.jobOrders.push(...cluster.jobOrders);
          assignment.centroid = cluster.centroid;
          employee.remainingSpace -= cluster.totalSpaceRequired;
          processedClusters.add(cluster.id);
          employeesWithoutCluster.delete(employee.id);
          break;
        } else {
          // Remove job orders from the end until the cluster fits
          const modifiedClusterOrders = [...cluster.jobOrders];
          const removedOrders: JobOrders[] = [];
          let totalSpace = cluster.totalSpaceRequired;

          while (totalSpace > employee.remainingSpace && modifiedClusterOrders.length > 0) {
            const removedOrder = modifiedClusterOrders.pop()!;
            removedOrders.push(removedOrder);
            totalSpace -= Number(removedOrder.spaceRequried);
          }

          if (modifiedClusterOrders.length > 0) {
            // Assign the reduced cluster
            assignment.jobOrders.push(...modifiedClusterOrders);
            employee.remainingSpace -= totalSpace;
            // Add removed orders to unassigned
            unassignedAssignment.jobOrders.push(...removedOrders);
            processedClusters.add(cluster.id);
            employeesWithoutCluster.delete(employee.id);
            break;
          }
        }
      }
    }

    const unassignedClusters = optimizedClusters.filter(cluster => !processedClusters.has(cluster.id));
    unassignedAssignment.jobOrders.push(...unassignedClusters.flatMap(cluster => cluster.jobOrders));

    // 7. Handle unassigned orders with route optimization
    const remainingUnassigned: JobOrders[] = [];

    for (const order of unassignedAssignment.jobOrders) {
      let bestAssignment: Assignment | null = null;
      let minDistance = maxDistance;

      for (const assignment of assignments) {
        if (assignment.employeeId === "jobOrders") continue;

        const employee = employeesWithCapacity.find(e => e.id === assignment.employeeId)!;
        if (employee.remainingSpace < Number(order.spaceRequried)) continue;

        const distance = calculateDistance(
          employee.areaLat,
          employee.areaLong,
          decimalToNumber(order.latitude),
          decimalToNumber(order.longitude)
        );

        if (distance < minDistance) {
          minDistance = distance;
          bestAssignment = assignment;
        }
      }

      if (bestAssignment) {
        bestAssignment.jobOrders.push(order);
        const employee = employeesWithCapacity.find(e => e.id === bestAssignment.employeeId)!;
        employee.remainingSpace -= Number(order.spaceRequried);
      } else {
        remainingUnassigned.push(order);
      }
    }

    // Update unassignedAssignment with truly unassigned orders
    unassignedAssignment.jobOrders = remainingUnassigned;

    // 8. Final route optimization for all assignments
    for (const assignment of assignments) {
      if (assignment.employeeId === "jobOrders") continue;

      if (assignment.jobOrders.length > 0) {
        const locations = assignment.jobOrders.map(order => ({
          lat: decimalToNumber(order.latitude),
          lng: decimalToNumber(order.longitude),
          placeId: order.placeId,
        }));

        try {
          const result = await optimizeRoute(locations, depot);
          if (!result.error) {
            assignment.jobOrders = result.locations.map(
              location => assignment.jobOrders.find(
                order => order.placeId === location.placeId
              )!
            );
          }
        } catch (error) {
          console.error("Error optimizing route:", error);
        }
      }
    }

    return { assignments };
  } catch (error) {
    console.error("Error in route optimization:", error);
    return {
      assignments: [],
      error: "Failed to optimize routes",
    };
  }
}