import { kmeans } from 'ml-kmeans'
import { JobOrders } from "@prisma/client"
import { Location, Cluster } from "@/app/types/routing"

function jobOrderToVector(order: JobOrders): number[] {
  return [Number(order.latitude), Number(order.longitude)]
}

function vectorToLocation(vector: number[]): Location {
  return { lat: vector[0], lng: vector[1] }
}

export function kMeansClustering(
  jobOrders: JobOrders[],
  k: number
): Cluster[] {
  // Convert locations to vectors for ml-kmeans
  const vectors = jobOrders.map(jobOrderToVector)
  
  // Perform k-means clustering
  const { clusters: assignments, centroids } = kmeans(vectors, k, {
    initialization: 'kmeans++',
    maxIterations: 100
  })

  // Group job orders by cluster
  const clusters: Cluster[] = Array.from({ length: k }, (_, i) => ({
    id: i,
    jobOrders: [],
    totalSpaceRequired: 0,
    centroid: vectorToLocation(centroids[i])
  }))

  // Assign job orders to their clusters
  assignments.forEach((clusterIndex, orderIndex) => {
    const order = jobOrders[orderIndex]
    clusters[clusterIndex].jobOrders.push(order)
    clusters[clusterIndex].totalSpaceRequired += Number(jobOrders[orderIndex].spaceRequried)
  })

  return clusters
}

