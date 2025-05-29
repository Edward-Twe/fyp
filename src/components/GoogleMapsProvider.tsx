"use client"

import { createContext, useContext } from 'react'
import { useLoadScript } from '@react-google-maps/api'

interface GoogleMapsContextType {
  isLoaded: boolean
  loadError: Error | undefined
}

const GoogleMapsContext = createContext<GoogleMapsContextType>({
  isLoaded: false,
  loadError: undefined
})

export const useGoogleMaps = () => useContext(GoogleMapsContext)

export function GoogleMapsProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: 'AIzaSyC3zmwni5ehVSO6BTnaV96-W32_8pH1vcY',
    libraries: ['places', 'marker'],
  })

  return (
    <GoogleMapsContext.Provider value={{ isLoaded, loadError }}>
      {children}
    </GoogleMapsContext.Provider>
  )
}

