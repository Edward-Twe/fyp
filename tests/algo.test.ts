import { describe, it, expect } from '@jest/globals';
import { JobOrders } from '@prisma/client';
import { kMeansClusteringD } from '@/app/(main)/schedule/utils/clusteringDistance';
import { calculateDistance };
import type { Location } from '@/app/types/routing';

describe('Geospatial Calculations', () => {
  describe('calculateDistance()', () => {
    it('returns 0 for identical points', () => {
      const point: Location = { lat: 13.7563, lng: 100.5018 };
      expect(calculateDistance(point, point)).toBeCloseTo(0);
    });

    it('calculates distance between Bangkok landmarks', () => {
      const grandPalace: Location = { lat: 13.7500, lng: 100.4915 };
      const watArun: Location = { lat: 13.7439, lng: 100.4905 };
      const distance = calculateDistance(grandPalace, watArun);
      expect(distance).toBeCloseTo(0.7, 0); // ~700 meters
    });

    it('handles antipodal points', () => {
      const pointA: Location = { lat: 0, lng: 0 };
      const pointB: Location = { lat: 0, lng: 180 };
      expect(calculateDistance(pointA, pointB)).toBeCloseTo(20015, -1);
    });
  });

  
});

describe('Clustering Algorithm', () => {
  const createOrders = (coordinates: Array<[number, number]>): JobOrders[] => 
    coordinates.map(([lat, lng], i) => ({
      id: `${i}`,
      latitude: lat.toString(),
      longitude: lng.toString(),
      spaceRequried: 1,
      // Add other required fields
    }));

  describe('kMeansClusteringD()', () => {
    it('creates single cluster for close points', () => {
      const orders = createOrders([
        [13.7563, 100.5018],
        [13.7564, 100.5019],
        [13.7562, 100.5017]
      ]);
      
      const clusters = kMeansClusteringD(orders, 0.5); // 500m max
      expect(clusters.length).toBe(1);
      expect(clusters[0].jobOrders.length).toBe(3);
    });

    it('creates multiple clusters for distant points', () => {
      const orders = createOrders([
        [13.7563, 100.5018],  // Bangkok
        [13.7469, 100.5400],  // 4km NE
        [14.7563, 101.5018]   // 150km N
      ]);
      
      const clusters = kMeansClusteringD(orders, 1); // 1km max
      expect(clusters.length).toBe(2);
    });

    it('handles empty input', () => {
      const clusters = kMeansClusteringD([], 1);
      expect(clusters).toEqual([]);
    });

    it('correctly recalculates centroids', () => {
      const orders = createOrders([
        [0, 0],
        [2, 2],
        [4, 4]
      ]);
      
      const clusters = kMeansClusteringD(orders, 10);
      expect(clusters[0].centroid).toEqual({
        lat: (0 + 2 + 4) / 3,
        lng: (0 + 2 + 4) / 3
      });
    });
  });
});
