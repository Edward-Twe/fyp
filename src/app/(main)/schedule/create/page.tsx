"use client"

import KanbanBoard from "@/components/kanban-board"
import { SelectionDialog } from "@/components/SelectionDialog"
import { DepartureDialog, type DepartureInfo } from "@/components/DepartureDialog"
import { Employees } from "@prisma/client"
import { useEffect, useState } from "react"
import { loadEmployees } from "../../employees/loadEmployees"
import { useOrganization } from "@/app/contexts/OrganizationContext"
import { loadJobOrders } from "../../job-orders/loadJobOrders"
import { parseISO, isValid, format } from "date-fns"
import { Button } from "@/components/ui/button"
import { optimizeRoutes } from "./AutoSced"
import { Location, JobOrderWithTasks, Columns } from "@/app/types/routing"
import { ErrorAlert } from "@/components/ui/alert-box"

export default function Schedules() {
  const { selectedOrg } = useOrganization()
  const [employees, setEmployees] = useState<Employees[]>([])
  const [jobOrders, setJobOrders] = useState<JobOrderWithTasks[]>([])
  const [selectedEmployees, setSelectedEmployees] = useState<Employees[]>([])
  const [selectedJobOrders, setSelectedJobOrders] = useState<JobOrderWithTasks[]>([])
  const [departure, setDeparture] = useState<DepartureInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [columns, setColumns] = useState<Columns>({})

  useEffect(() => {
    async function fetchEmpJob() {
      if (!selectedOrg) {
        setIsLoading(false)
        setError("Select an Organization")
        return
      }
      setIsLoading(true)
      try {
        const emp = await loadEmployees(selectedOrg.id)
        const job = await loadJobOrders(selectedOrg.id)
        
        if ("error" in emp) {
          setError(emp.error)
        } else if ("error" in job) {
          setError(job.error)
        } else {
          setEmployees(emp)
          setJobOrders(job)
          setError(null)
        }
      } catch (err) {
        setError("An unexpected error occurred")
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchEmpJob()
  }, [selectedOrg])

  const getValidDateString = (date: Date | string | null | undefined): string => {
    if (!date) return new Date().toISOString();
    
    try {
      if (date instanceof Date) {
        return isValid(date) ? date.toISOString() : new Date().toISOString();
      }
      
      const parsedDate = parseISO(date);
      if (isValid(parsedDate)) {
        return parsedDate.toISOString();
      }

      return new Date().toISOString();
    } catch {
      return new Date().toISOString();
    }
  };

  async function autoSchedule() {
    if (!departure || selectedEmployees.length === 0 || selectedJobOrders.length === 0) {
      setError("Please select departure location, employees, and job orders")
      return
    }

    try {
      const depot: Location = {
        lat: departure.location.latitude,
        lng: departure.location.longitude
      }

      const schedule = await optimizeRoutes(selectedJobOrders, selectedEmployees, depot)
      
      // Create new columns state based on optimized assignments
      const newColumns: Columns = {
        jobOrders: {
          id: 'jobOrders',
          title: 'Job Orders',
          jobOrders: []
        }
      }

      // Add employee columns and assign job orders based on optimization results
      schedule.assignments.forEach(assignment => {
        const employee = selectedEmployees.find(emp => emp.id === assignment.employeeId)
        if (employee) {
          newColumns[employee.id] = {
            id: employee.id,
            title: employee.name,
            jobOrders: assignment.jobOrders as JobOrderWithTasks[]
          }
        }
      })

      // Update columns state
      setColumns(newColumns)
      
    } catch (error) {
      console.error('Error in auto-scheduling:', error)
      setError('Failed to optimize routes')
    }
  }

  if (isLoading) return <div className="p-4">Loading...</div>

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      <ErrorAlert error={error} onClose={() => setError(null)} />
      <div className="flex-shrink-0 p-4 pb-0 space-y-4">
        <div className="flex gap-4">
          <SelectionDialog
            title="Employees"
            items={employees}
            selectedItems={selectedEmployees}
            getItemId={(employee) => employee.id}
            getItemLabel={(employee) => `${employee.name}`}
            onSelectionChange={setSelectedEmployees}
          />
          <SelectionDialog
            title="Job Orders"
            items={jobOrders}
            selectedItems={selectedJobOrders}
            getItemId={(jobOrder) => jobOrder.id}
            getItemLabel={(jobOrder) => jobOrder.orderNumber}
            getItemDate={(jobOrder) => getValidDateString(jobOrder.createdAt)}
            onSelectionChange={setSelectedJobOrders}
          />
          <DepartureDialog
            departure={departure}
            onDepartureChange={setDeparture}
          />
          <Button size="sm" variant="outline" onClick={autoSchedule}>
            AutoSched
          </Button>
        </div>
        
        {departure && (
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div>
              <span className="font-medium">Departure:</span>{" "}
              <span className="text-muted-foreground">
                {format(departure.datetime, "PPP")} at {format(departure.datetime, "p")}
              </span>
            </div>
            <div>
              <span className="font-medium">Location:</span>{" "}
              <span className="text-muted-foreground">{departure.location.address}</span>
            </div>
            <div className="text-sm text-muted-foreground">
              {departure.location.city}, {departure.location.state} {departure.location.postCode}, {departure.location.country}
            </div>
          </div>
        )}
      </div>
      
      <div className="flex-grow overflow-hidden">
        {selectedEmployees.length === 0 || selectedJobOrders.length === 0 ? (
          <div className="h-full flex items-center justify-center text-center text-muted-foreground p-8">
            Please select employees and job orders to start scheduling
          </div>
        ) : (
          <KanbanBoard 
            employees={selectedEmployees} 
            jobOrders={selectedJobOrders}
            columns={columns}
            onColumnsChange={setColumns} 
            depot={departure?.location}
          />
        )}
      </div>
    </div>
  )
}

