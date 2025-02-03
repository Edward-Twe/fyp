"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { GoogleMap, Marker, DirectionsRenderer } from "@react-google-maps/api"
import { useCallback, useEffect, useState } from "react"
import type { JobOrderWithTasks } from "@/app/types/routing"
import { Droppable, Draggable, DragDropContext, type DropResult } from "@hello-pangea/dnd"
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion"
import { Clock } from "lucide-react"
import { formatDuration } from "date-fns"
import type { LocationDetails } from "./DepartureDialog"

interface BoardMapDialogProps {
  isOpen: boolean
  onClose: () => void
  jobOrders: JobOrderWithTasks[]
  depot: LocationDetails
  employeeName: string
  columnId: string
  onJobOrdersChange: (columnId: string, updatedJobOrders: JobOrderWithTasks[]) => void
}

interface TravelInfo {
  totalTime: number // in seconds
  legTimes: number[] // in seconds
}

const mapContainerStyle = {
  width: "100%",
  height: "100%",
}

function formatTime(seconds: number): string {
  const duration = {
    hours: Math.floor(seconds / 3600),
    minutes: Math.floor((seconds % 3600) / 60),
  }

  return formatDuration(duration, { format: ["hours", "minutes"] })
}

export function BoardMapDialog({
  isOpen,
  onClose,
  jobOrders,
  depot,
  employeeName,
  columnId,
  onJobOrdersChange,
}: BoardMapDialogProps) {
  const [localJobOrders, setLocalJobOrders] = useState(jobOrders)
  const [center] = useState<google.maps.LatLngLiteral>({
    lat: depot.latitude,
    lng: depot.longitude,
  })
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null)
  const [travelInfo, setTravelInfo] = useState<TravelInfo>({
    totalTime: 0,
    legTimes: [],
  })

  const fetchDirections = useCallback(async () => {
    if (!localJobOrders.length) return

    const directionsService = new google.maps.DirectionsService()

    const waypoints = localJobOrders.map((order) => ({
      location: new google.maps.LatLng(Number(order.latitude), Number(order.longitude)),
      stopover: true,
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
        const legTimes = result.routes[0].legs.map((leg) => leg.duration?.value || 0)
        const totalTime = legTimes.reduce((sum, time) => sum + time, 0)
        setTravelInfo({ totalTime, legTimes })
      }
    } catch (error) {
      console.error("Error fetching directions:", error)
    }
  }, [localJobOrders, depot])

  useEffect(() => {
    if (isOpen) {
      fetchDirections()
    }
  }, [isOpen, fetchDirections, localJobOrders])

  const handleDragEnd = (result: DropResult) => {
    const { source, destination } = result

    if (!destination) return

    const reorderedJobOrders = Array.from(localJobOrders)
    const [removed] = reorderedJobOrders.splice(source.index, 1)
    reorderedJobOrders.splice(destination.index, 0, removed)

    setLocalJobOrders(reorderedJobOrders)
    onJobOrdersChange(columnId, reorderedJobOrders)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="h-[80vh] max-w-7xl">
        <DialogHeader>
          <DialogTitle>{employeeName}&apos;s Route Planning</DialogTitle>
        </DialogHeader>
        <div className="mt-4 grid h-[calc(80vh-8rem)] grid-cols-2 gap-4">
          {/* Left side - Kanban Board */}
          <div className="flex flex-col overflow-hidden">
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
                  <Droppable droppableId={columnId}>
                    {(provided) => (
                      <div 
                        {...provided.droppableProps} 
                        ref={provided.innerRef} 
                        className="h-full overflow-y-auto p-2"
                      >
                        {localJobOrders.map((order, index) => (
                          <Draggable 
                            key={order.id} 
                            draggableId={order.id} 
                            index={index}
                          >
                            {(provided, snapshot) => {
                              const draggableStyle = {
                                ...provided.draggableProps.style,
                                transform: snapshot.isDragging ? provided.draggableProps.style?.transform : 'translate(0,0)'
                              }

                              return (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  style={draggableStyle}
                                  className={`mb-2 rounded bg-secondary p-2 shadow transition-shadow ${
                                    snapshot.isDragging ? 'shadow-lg' : ''
                                  }`}
                                >
                                  <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing">
                                    <Accordion type="single" collapsible>
                                      <AccordionItem value={order.id}>
                                        <div className="flex w-full items-center justify-between">
                                          <div className="flex-1">
                                            <div className="flex items-center justify-between">
                                              <h4 className="text-sm font-semibold">Order #{order.orderNumber}</h4>
                                              {travelInfo.legTimes[index] && (
                                                <span className="text-xs text-muted-foreground">
                                                  Travel: {formatTime(travelInfo.legTimes[index])}
                                                </span>
                                              )}
                                            </div>
                                            <p className="text-xs text-gray-500">{order.address}</p>
                                          </div>
                                          <AccordionTrigger className="text-right" />
                                        </div>
                                        <AccordionContent>
                                          <div className="mt-2 space-y-2">
                                            <h5 className="text-xs font-medium">Tasks:</h5>
                                            <ul className="list-inside list-disc text-xs">
                                              {order.JobOrderTask.map((jobOrderTask) => (
                                                <li key={jobOrderTask.id}>
                                                  {jobOrderTask.task.task} - Quantity: {jobOrderTask.quantity}
                                                  <span className="ml-2 text-gray-500">
                                                    ({jobOrderTask.task.requiredTimeValue.toString()}{" "}
                                                    {jobOrderTask.task.requiredTimeUnit})
                                                  </span>
                                                </li>
                                              ))}
                                            </ul>
                                          </div>
                                        </AccordionContent>
                                      </AccordionItem>
                                    </Accordion>
                                  </div>
                                </div>
                              )
                            }}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              </CardContent>
              <CardFooter className="border-t py-2">
                <div className="flex w-full items-center justify-between text-sm">
                  <span className="font-medium">Route Summary:</span>
                  <div className="text-muted-foreground">
                    {localJobOrders.length} stops • {formatTime(travelInfo.totalTime)} total travel time
                  </div>
                </div>
              </CardFooter>
            </Card>
          </div>

          {/* Right side - Map */}
          <div className="relative overflow-hidden rounded-lg border">
            <GoogleMap mapContainerStyle={mapContainerStyle} center={center} zoom={12}>
              {/* Depot marker */}
              <Marker
                position={{ lat: depot.latitude, lng: depot.longitude }}
                icon={{
                  url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png",
                }}
                label={{
                  text: "D",
                  color: "white",
                  fontWeight: "bold"
                }}
                title="Depot"
              />

              {/* Job order markers with numbers */}
              {localJobOrders.map((order, index) => (
                <Marker
                  key={order.id}
                  position={{ 
                    lat: Number(order.latitude), 
                    lng: Number(order.longitude) 
                  }}
                  label={{
                    text: (index + 1).toString(),
                    color: "white",
                    fontWeight: "bold"
                  }}
                  title={`Stop ${index + 1}: Order #${order.orderNumber}`}
                />
              ))}

              {directions && (
                <DirectionsRenderer
                  directions={directions}
                  options={{
                    suppressMarkers: true, // Hide default markers
                    polylineOptions: {
                      strokeColor: "#4A90E2",
                      strokeWeight: 4
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

