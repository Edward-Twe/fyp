import type { JobOrders } from "@prisma/client"
import type { Location, Cluster } from "@/app/types/routing"

function calculateDistance(point1: Location, point2: Location): number {
  const R = 6371 // Earth's radius in kilometers
  const dLat = ((point2.lat - point1.lat) * Math.PI) / 180
  const dLon = ((point2.lng - point1.lng) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((point1.lat * Math.PI) / 180) *
      Math.cos((point2.lat * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function jobOrderToLocation(order: JobOrders): Location {
  return { lat: Number(order.latitude), lng: Number(order.longitude) }
}

export function kMeansClusteringD(jobOrders: JobOrders[]): Cluster[] {
  const MAX_DISTANCE = 20 // Maximum distance in kilometers

  const clusters: Cluster[] = []
  let clusterIndex = 0

  for (const order of jobOrders) {
    const orderLocation = jobOrderToLocation(order)
    let assigned = false

    for (const cluster of clusters) {
      if (calculateDistance(orderLocation, cluster.centroid) <= MAX_DISTANCE) {
        cluster.jobOrders.push(order)
        cluster.totalSpaceRequired += Number(order.spaceRequried)
        assigned = true
        break
      }
    }

    if (!assigned) {
      clusters.push({
        id: clusterIndex++,
        jobOrders: [order],
        totalSpaceRequired: Number(order.spaceRequried),
        centroid: orderLocation,
      })
    }
  }

  // Recalculate centroids
  clusters.forEach((cluster) => {
    if (cluster.jobOrders.length > 1) {
      const sumLat = cluster.jobOrders.reduce((sum, order) => sum + Number(order.latitude), 0)
      const sumLng = cluster.jobOrders.reduce((sum, order) => sum + Number(order.longitude), 0)
      cluster.centroid = {
        lat: sumLat / cluster.jobOrders.length,
        lng: sumLng / cluster.jobOrders.length,
      }
    }
  })

  return clusters
}

