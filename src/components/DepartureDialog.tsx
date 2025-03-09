"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Clock } from 'lucide-react'
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { CalendarIcon } from 'lucide-react'
import { format, set } from "date-fns"
import { cn } from "@/lib/utils"
import { StandaloneSearchBox } from "@react-google-maps/api"
import { useGoogleMaps } from "@/components/GoogleMapsProvider"

export interface LocationDetails {
  address: string
  city: string
  postCode: string
  state: string
  country: string
  latitude: number
  longitude: number
  placeId: string
}

export interface DepartureInfo {
  datetime: Date
  location: LocationDetails
}

interface DepartureDialogProps {
  departure: DepartureInfo | null
  onDepartureChange: (info: DepartureInfo) => void
  icon?: React.ReactElement
}

export function DepartureDialog({ departure, onDepartureChange }: DepartureDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [date, setDate] = useState<Date | undefined>(departure?.datetime || undefined)
  const [time, setTime] = useState(departure?.datetime ? format(departure.datetime, "HH:mm") : "")
  const [location, setLocation] = useState<LocationDetails>(
    departure?.location || {
      address: "",
      city: "",
      postCode: "",
      state: "",
      country: "",
      latitude: 0,
      longitude: 0,
      placeId: ""
    }
  )
  
  const { isLoaded } = useGoogleMaps()
  const searchBoxRef = useRef<google.maps.places.SearchBox | null>(null)
  const addressInputRef = useRef<HTMLInputElement>(null)
  const [isSelectingPlace, setIsSelectingPlace] = useState(false)

  // Handle input focus
  const handleInputFocus = () => {
    setIsSelectingPlace(true)
  }

  // Handle input blur with delay
  const handleInputBlur = () => {
    setTimeout(() => {
      setIsSelectingPlace(false)
    }, 200)
  }

  const handlePlaceChanged = () => {
    const places = searchBoxRef.current?.getPlaces()
    if (places && places.length > 0) {
      const place = places[0]
      const addressComponents = place.address_components

      if (addressComponents) {
        const getAddressComponent = (
          components: google.maps.GeocoderAddressComponent[],
          type: string
        ): string => {
          const component = components.find((c) => c.types.includes(type))
          return component ? component.long_name : ""
        }

        setLocation({
          address: place.formatted_address || "",
          city: getAddressComponent(addressComponents, "locality"),
          postCode: getAddressComponent(addressComponents, "postal_code"),
          state: getAddressComponent(addressComponents, "administrative_area_level_1"),
          country: getAddressComponent(addressComponents, "country"),
          latitude: place.geometry?.location?.lat() || 0,
          longitude: place.geometry?.location?.lng() || 0,
          placeId: place.place_id || ""
        })
      }
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!date || !time || !location.address) return

    // Combine date and time into a single DateTime
    const [hours, minutes] = time.split(":").map(Number)
    const datetime = set(date, {
      hours: hours || 0,
      minutes: minutes || 0,
      seconds: 0,
      milliseconds: 0
    })

    onDepartureChange({ datetime, location })
    setIsOpen(false)
  }

  const handleDateSelect = (newDate: Date | undefined) => {
    setDate(newDate)
    setIsCalendarOpen(false)
  }

  const handleOpenChange = (open: boolean) => {
    if (!open && isSelectingPlace) {
      return
    }
    setIsOpen(open)
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Clock className="h-4 w-4 mr-2" />
          {departure ? "Edit Departure" : "Set Departure"}
        </Button>
      </DialogTrigger>
      <DialogContent 
        className="sm:max-w-[425px]" 
        style={{ overflow: 'visible' }}
      >
        <DialogHeader>
          <DialogTitle>Set Departure Details</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Departure Date</Label>
            <Popover modal open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                  onClick={() => setIsCalendarOpen(true)}
                  type="button"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent 
                className="w-auto p-0" 
                align="start"
                side="bottom"
                sideOffset={8}
              >
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={handleDateSelect}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Label htmlFor="time">Departure Time</Label>
            <Input
              id="time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">Departure Location</Label>
            <div className="relative">
              {isLoaded ? (
                <StandaloneSearchBox
                  onLoad={(ref) => {
                    searchBoxRef.current = ref
                  }}
                  onPlacesChanged={handlePlaceChanged}
                >
                  <Input
                    value={location.address}
                    onChange={(e) => setLocation(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="Search for a location"
                    required
                    ref={addressInputRef}
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                  />
                </StandaloneSearchBox>
              ) : (
                <Input disabled placeholder="Loading Google Maps..." />
              )}
            </div>
          </div>
          <div className="flex justify-end">
            <Button 
              type="submit"
              disabled={!date || !time || !location.address}
            >
              Save
            </Button>
          </div>
        </form>
      </DialogContent>
      <style jsx global>{`
        .pac-container {
          z-index: 2000 !important;
          position: fixed !important;
          pointer-events: auto !important;
        }
        .pac-item {
          cursor: pointer !important;
        }
        .pac-item:hover {
          background-color: #f3f4f6 !important;
        }
      `}</style>
    </Dialog>
  )
}

