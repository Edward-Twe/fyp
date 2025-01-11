"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { GoogleMap, Marker, DirectionsRenderer } from "@react-google-maps/api"
import { useCallback, useEffect, useState } from "react"
import { JobOrderWithTasks, Column } from "@/app/types/routing"
import { Droppable, Draggable, DragDropContext, DropResult } from "@hello-pangea/dnd"
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./ui/accordion"
import { Clock } from 'lucide-react'
import { formatDuration } from "date-fns"
import { LocationDetails } from "./DepartureDialog"

interface BoardMapDialogProps {
  isOpen: boolean
  onClose: () => void
  jobOrders: JobOrderWithTasks[]
  depot: LocationDetails
  employeeName: string
  column: Column
  onJobOrdersChange: (updatedJobOrders: JobOrderWithTasks[]) => void
}

interface TravelInfo {
  totalTime: number // in seconds
  legTimes: number[] // in seconds
}

const mapContainerStyle = {
  width: '100%',
  height: '100%'
}

function formatTime(seconds: number): string {
  const duration = {
    hours: Math.floor(seconds / 3600),
    minutes: Math.floor((seconds % 3600) / 60)
  }
  
  return formatDuration(duration, { format: ['hours', 'minutes'] })
}

export function BoardMapDialog({ 
  isOpen, 
  onClose, 
  jobOrders, 
  depot, 
  employeeName,
  column,
  onJobOrdersChange
}: BoardMapDialogProps) {
  const [center] = useState<google.maps.LatLngLiteral>({
    lat: depot.latitude,
    lng: depot.longitude
  })
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null)
  const [travelInfo, setTravelInfo] = useState<TravelInfo>({ totalTime: 0, legTimes: [] })

  const fetchDirections = useCallback(async () => {
    if (!jobOrders.length) return

    const directionsService = new google.maps.DirectionsService()

    const waypoints = jobOrders.map(order => ({
      location: new google.maps.LatLng(
        Number(order.latitude),
        Number(order.longitude)
      ),
      stopover: true
    }))

    try {
      const result = await directionsService.route({
        origin: new google.maps.LatLng(depot.latitude, depot.longitude),
        destination: new google.maps.LatLng(depot.latitude, depot.longitude),
        waypoints: waypoints,
        optimizeWaypoints: true,
        travelMode: google.maps.TravelMode.DRIVING,
      })

      setDirections(result)

      // Calculate travel times
      if (result.routes[0]?.legs) {
        const legTimes = result.routes[0].legs.map(leg => leg.duration?.value || 0)
        const totalTime = legTimes.reduce((sum, time) => sum + time, 0)
        setTravelInfo({ totalTime, legTimes })
      }

    } catch (error) {
      console.error("Error fetching directions:", error)
    }
  }, [jobOrders, depot])

  useEffect(() => {
    if (isOpen) {
      fetchDirections()
    }
  }, [isOpen, fetchDirections, jobOrders])

  const handleDragEnd = (result: DropResult) => {
    const { destination, source } = result

    if (!destination) return

    const reorderedJobOrders = Array.from(jobOrders)
    const [removed] = reorderedJobOrders.splice(source.index, 1)
    reorderedJobOrders.splice(destination.index, 0, removed)

    onJobOrdersChange(reorderedJobOrders)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl h-[80vh]">
        <DialogHeader>
          <DialogTitle>{employeeName}&apos;s Route Planning</DialogTitle>
        </DialogHeader>
        <div className="mt-4 grid grid-cols-2 gap-4 h-[calc(80vh-8rem)]">
          {/* Left side - Kanban Board */}
          <div className="overflow-hidden flex flex-col">
            <Card className="h-full">
              <CardHeader className="flex-shrink-0 border-b py-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">{employeeName}</h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>Total Travel Time: {formatTime(travelInfo.totalTime)}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-grow overflow-hidden p-0">
                <DragDropContext onDragEnd={handleDragEnd}>
                  <Droppable droppableId={column.id}>
                    {(provided) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className="h-full overflow-y-auto p-2"
                      >
                        {jobOrders.map((order, index) => (
                          <Draggable
                            key={order.id}
                            draggableId={order.id}
                            index={index}
                          >
                            {(provided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className="mb-2 rounded bg-secondary p-2 shadow"
                              >
                                <Accordion type="single" collapsible>
                                  <AccordionItem value={order.id}>
                                    <AccordionTrigger className="text-left">
                                      <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                          <h4 className="text-sm font-semibold">
                                            Order #{order.orderNumber}
                                          </h4>
                                          {travelInfo.legTimes[index] && (
                                            <span className="text-xs text-muted-foreground">
                                              Travel: {formatTime(travelInfo.legTimes[index])}
                                            </span>
                                          )}
                                        </div>
                                        <p className="text-xs text-gray-500">
                                          {order.address}
                                        </p>
                                      </div>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                      <div className="mt-2 space-y-2">
                                        <h5 className="text-xs font-medium">Tasks:</h5>
                                        <ul className="list-inside list-disc text-xs">
                                          {order.JobOrderTask.map(
                                            (jobOrderTask) => (
                                              <li key={jobOrderTask.id}>
                                                {jobOrderTask.task.task} - Quantity:{" "}
                                                {jobOrderTask.quantity}
                                                <span className="ml-2 text-gray-500">
                                                  ({jobOrderTask.task.requiredTimeValue.toString()}{" "}
                                                  {jobOrderTask.task.requiredTimeUnit})
                                                </span>
                                              </li>
                                            )
                                          )}
                                        </ul>
                                      </div>
                                    </AccordionContent>
                                  </AccordionItem>
                                </Accordion>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              </CardContent>
              <CardFooter className="border-t py-2">
                <div className="flex items-center justify-between w-full text-sm">
                  <span className="font-medium">Route Summary:</span>
                  <div className="text-muted-foreground">
                    {jobOrders.length} stops • {formatTime(travelInfo.totalTime)} total travel time
                  </div>
                </div>
              </CardFooter>
            </Card>
          </div>

          {/* Right side - Map */}
          <div className="relative rounded-lg overflow-hidden border">
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={center}
              zoom={12}
            >
              <Marker
                position={{ lat: depot.latitude, lng: depot.longitude }}
                icon={{
                  url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png"
                }}
                title="Depot"
              />

              {directions && (
                <DirectionsRenderer
                  directions={directions}
                  options={{
                    suppressMarkers: false,
                    markerOptions: {
                      icon: "http://maps.google.com/mapfiles/ms/icons/red-dot.png"
                    }
                  }}
                />
              )}
            </GoogleMap>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

