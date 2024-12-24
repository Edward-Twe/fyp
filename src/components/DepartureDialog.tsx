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
import { Autocomplete } from "@react-google-maps/api"
import { useGoogleMaps } from "@/components/GoogleMapsProvider"

export interface LocationDetails {
  address: string
  city: string
  postCode: string
  state: string
  country: string
  latitude: number
  longitude: number
}

export interface DepartureInfo {
  datetime: Date
  location: LocationDetails
}

interface DepartureDialogProps {
  departure: DepartureInfo | null
  onDepartureChange: (info: DepartureInfo) => void
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
      longitude: 0
    }
  )
  
  const { isLoaded } = useGoogleMaps()
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)

  const handlePlaceChanged = () => {
    const place = autocompleteRef.current?.getPlace()
    if (place && place.address_components) {
      const getAddressComponent = (
        components: google.maps.GeocoderAddressComponent[],
        type: string
      ): string => {
        const component = components.find((c) => c.types.includes(type))
        return component ? component.long_name : ""
      }

      setLocation({
        address: place.formatted_address || "",
        city: getAddressComponent(place.address_components, "locality"),
        postCode: getAddressComponent(place.address_components, "postal_code"),
        state: getAddressComponent(place.address_components, "administrative_area_level_1"),
        country: getAddressComponent(place.address_components, "country"),
        latitude: place.geometry?.location?.lat() || 0,
        longitude: place.geometry?.location?.lng() || 0,
      })
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

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Clock className="h-4 w-4 mr-2" />
          {departure ? "Edit Departure" : "Set Departure"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
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
            <div className="space-y-2">
              {isLoaded ? (
                <Autocomplete
                  onLoad={(autocomplete) => {
                    autocompleteRef.current = autocomplete
                  }}
                  onPlaceChanged={handlePlaceChanged}
                  options={{
                    fields: ["address_components", "formatted_address", "geometry"],
                  }}
                >
                  <Input
                    value={location.address}
                    onChange={(e) => setLocation(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="Search for a location"
                    required
                    className="w-full"
                  />
                </Autocomplete>
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
    </Dialog>
  )
}

