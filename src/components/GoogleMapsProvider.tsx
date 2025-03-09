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
    googleMapsApiKey: 'AIzaSyDjaP1gfCD0nszBI8oIeVTTromlWp0Mq9w',
    libraries: ['places', 'marker'],
  })

  return (
    <GoogleMapsContext.Provider value={{ isLoaded, loadError }}>
      {children}
    </GoogleMapsContext.Provider>
  )
}

