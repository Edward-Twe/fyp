import { useState } from "react"

export type SortDirection = "asc" | "desc"

export interface SortConfig<T> {
  key: keyof T | null
  direction: SortDirection
}

export function useTableSort<T extends Record<string, any>>(initialData: T[]) {
  const [data, setData] = useState<T[]>(initialData)
  const [sortConfig, setSortConfig] = useState<SortConfig<T>>({
    key: null,
    direction: "asc",
  })

  const handleSort = (key: keyof T) => {
    let direction: SortDirection = "asc"

    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc"
    }

    setSortConfig({ key, direction })

    const sortedData = [...data].sort((a, b) => {
      const aValue = a[key]
      const bValue = b[key]

      // Handle null values
      if (aValue === null) return 1
      if (bValue === null) return -1

      // Convert both values to strings for comparison
      const aString = String(aValue)
      const bString = String(bValue)

      // For numeric values, convert to numbers for proper sorting
      if (typeof aValue === "number" || (typeof aValue === "object" && "toString" in aValue)) {
        const aNum = Number.parseFloat(aString)
        const bNum = Number.parseFloat(bString)
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return direction === "asc" ? aNum - bNum : bNum - aNum
        }
      }

      // For other fields, use string comparison
      return direction === "asc" ? aString.localeCompare(bString) : bString.localeCompare(aString)
    })

    setData(sortedData)
  }

  const getSortDirection = (key: keyof T): SortDirection | null => {
    if (sortConfig.key === key) {
      return sortConfig.direction
    }
    return null
  }

  return {
    data,
    setData,
    handleSort,
    getSortDirection,
    sortConfig,
  }
}

