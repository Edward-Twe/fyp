"use client"

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { GoogleMap, Marker, DirectionsRenderer } from "@react-google-maps/api"
import { useCallback, useEffect, useState } from "react"
import type { JobOrderWithTasks } from "@/app/types/routing"
import { Droppable, Draggable, DragDropContext, type DropResult } from "@hello-pangea/dnd"
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion"
import { Clock, ChevronDown } from "lucide-react"
import { formatDuration, format } from "date-fns"
import type { LocationDetails } from "./DepartureDialog"
import type { Roles } from "@prisma/client"
import { Button } from "@/components/ui/button"

interface BoardMapDialogProps {
  isOpen: boolean
  onClose: () => void
  jobOrders: JobOrderWithTasks[]
  depot: LocationDetails
  employeeName: string
  employeeId: string
  currentLat: number
  currentLng: number
  lastUpdatedAt: Date | null
  columnId: string
  onJobOrdersChange: (columnId: string, updatedJobOrders: JobOrderWithTasks[]) => void
  userRole: Roles | null
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
  userRole,
  currentLat,
  currentLng,
  lastUpdatedAt,
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
  const [isExpanded, setIsExpanded] = useState(false)
  const [map, setMap] = useState<google.maps.Map | null>(null)

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

  useEffect(() => {
    if (!map) return;

    const bounds = new google.maps.LatLngBounds();
    
    // Add depot marker with larger size
    const label = document.createElement("div");
label.style.color = "white";
label.style.fontSize = "16px";
label.style.fontWeight = "bold";
label.style.backgroundColor = "blue"; // Background color for visibility
label.style.padding = "4px";
label.style.borderRadius = "4px";
label.textContent = "D";

// Create the AdvancedMarkerElement
const depotMarker = new google.maps.marker.AdvancedMarkerElement({
  position: { lat: Number(depot.latitude), lng: Number(depot.longitude) },
  map,
  title: "Depot",
      content: label,
    });
    bounds.extend(depotMarker.position!);

    // Add employee's current location if available and user is admin/owner
    if (userRole === "admin" || userRole === "owner") {
      const locationInfo = document.createElement("div");
      locationInfo.className = "bg-white px-4 py-2 rounded-lg shadow-md";
      
      if (currentLat !== 1000 && currentLng !== 1000) {
        const employeeInitials = employeeName
          .split(" ")
          .map(name => name[0])
          .join("")
          .toUpperCase();

        const employeeMarker = new google.maps.Marker({
          position: { lat: currentLat, lng: currentLng },
          map,
          label: {
            text: employeeInitials,
            color: "white",
            fontSize: "16px",
            fontWeight: "bold"
          },
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 15,
            fillColor: "#4CAF50", // Green
            fillOpacity: 1,
            strokeWeight: 2,
            strokeColor: "#FFFFFF",
          },
          title: `${employeeName}'s current location${lastUpdatedAt ? `\nLast updated: ${format(new Date(lastUpdatedAt), "MMM d, yyyy h:mm a")}` : ""}`,
        });
        bounds.extend(employeeMarker.getPosition()!);

        locationInfo.innerHTML = `
          <p class="text-sm font-medium">${employeeName}'s Location</p>
          <p class="text-xs text-gray-500">Last updated: ${lastUpdatedAt ? format(new Date(lastUpdatedAt), "MMM d, yyyy h:mm a") : "Not available"}</p>
        `;
      } else {
        locationInfo.innerHTML = `
          <div class="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-yellow-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <p class="text-sm font-medium text-yellow-700">${employeeName} has not started location tracking</p>
          </div>
        `;
      }

      map.controls[google.maps.ControlPosition.TOP_RIGHT].push(locationInfo);
    }

    // Fit bounds with padding
    map.fitBounds(bounds, 50);

  }, [map, jobOrders, depot, currentLat, currentLng, lastUpdatedAt, employeeName, userRole]);

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
      <DialogContent className="h-[100dvh] w-screen max-w-full md:h-[80vh] md:max-w-7xl p-0 md:p-6">
          <DialogTitle className="sr-only">{employeeName}&apos;s Route Planning</DialogTitle>

        <div className="relative flex h-full flex-col md:flex-row md:gap-4">
          {/* Mobile Expand Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="absolute left-4 top-4 z-50 flex items-center gap-2 rounded-full bg-background/80 backdrop-blur-sm md:hidden"
          >
            <span className="font-semibold">Job Orders</span>
            <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
          </Button>

          {/* Job Orders Panel */}
          <div
            className={`absolute inset-x-0 top-0 z-40 w-full transform-gpu transition-transform duration-300 ease-in-out md:relative md:inset-auto md:w-1/2 ${
              isExpanded ? "translate-y-0" : "-translate-y-[calc(100%-4rem)]"
            } md:translate-y-0`}
          >
            <div className="h-[80vh] bg-background p-4 md:h-full">
              <Card className="h-full bg-gradient-to-b from-blue-100 to-blue-50 dark:from-blue-900/30 dark:to-blue-950/20">
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
                              isDragDisabled={userRole !== "owner" && userRole !== "admin"}
                            >
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`mb-2 rounded bg-secondary p-2 shadow transition-shadow ${
                                    snapshot.isDragging ? "shadow-lg" : ""
                                  }`}
                                >
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
                  <div className="flex w-full items-center justify-between text-sm">
                    <span className="font-medium">Route Summary:</span>
                    <div className="text-muted-foreground">
                      {localJobOrders.length} stops • {formatTime(travelInfo.totalTime)} total travel time
                    </div>
                  </div>
                </CardFooter>
              </Card>
            </div>
          </div>

          {/* Map */}
          <div className="relative h-full w-full overflow-hidden md:rounded-lg md:border">
            <GoogleMap mapContainerStyle={mapContainerStyle} center={center} zoom={12} onLoad={(map) => setMap(map)} options={{mapId: '209a40c5f19034b0'}}>
              <Marker
                position={{ lat: depot.latitude, lng: depot.longitude }}
                icon={{
                  url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png",
                }}
                label={{
                  text: "D",
                  color: "white",
                  fontWeight: "bold",
                }}
                title="Depot"
              />
              {localJobOrders.map((order, index) => (
                <Marker
                  key={order.id}
                  position={{
                    lat: Number(order.latitude),
                    lng: Number(order.longitude),
                  }}
                  label={{
                    text: (index + 1).toString(),
                    color: "white",
                    fontWeight: "bold",
                  }}
                  title={`Stop ${index + 1}: Order #${order.orderNumber}`}
                />
              ))}
              {directions && (
                <DirectionsRenderer
                  directions={directions}
                  options={{
                    suppressMarkers: true,
                    polylineOptions: {
                      strokeColor: "#4A90E2",
                      strokeWeight: 4,
                    },
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

