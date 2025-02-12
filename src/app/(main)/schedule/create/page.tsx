"use client";

import KanbanBoard from "@/components/kanban-board";
import { SelectionDialog } from "@/components/SelectionDialog";
import {
  DepartureDialog,
  type DepartureInfo,
} from "@/components/DepartureDialog";
import { Employees } from "@prisma/client";
import { startTransition, useEffect, useState } from "react";
import { loadEmployees } from "../../employees/loadEmployees";
import { useOrganization } from "@/app/contexts/OrganizationContext";
import { loadJobOrders } from "../../job-orders/loadJobOrders";
import { parseISO, isValid, format } from "date-fns";
import { Button } from "@/components/ui/button";
import { optimizeRoutes } from "../utils/AutoSced";
import { Location, JobOrderWithTasks, Columns } from "@/app/types/routing";
import { ErrorAlert } from "@/components/ui/alert-box";
import { createSchedule } from "./action";
import { SaveScheduleDialog } from "../utils/save-schedule-dialog";
import { ScheduleValues } from "@/lib/validation";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/hooks/use-toast";
import { LoadingDialog } from "@/components/LoadingDialog";
import { DistanceDialog } from "../utils/auto-sched-dialog";

export default function Schedules() {
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const { selectedOrg } = useOrganization();
  const [employees, setEmployees] = useState<Employees[]>([]);
  const [jobOrders, setJobOrders] = useState<JobOrderWithTasks[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<Employees[]>([]);
  const [selectedJobOrders, setSelectedJobOrders] = useState<
    JobOrderWithTasks[]
  >([]);
  const [departure, setDeparture] = useState<DepartureInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [columns, setColumns] = useState<Columns>({});
  const { toast } = useToast();
  const router = useRouter();
  const [isAutoScheduling, setIsAutoScheduling] = useState(false);
  const [isDistanceDialogOpen, setIsDistanceDialogOpen] = useState(false);
  const [maxDistance, setMaxDistance] = useState<number>(0);
  const [tempDistance, setTempDistance] = useState<string>("");

  useEffect(() => {
    async function fetchEmpJob() {
      if (!selectedOrg) {
        setIsLoading(false);
        setError("Select an Organization");
        return;
      }
      setIsLoading(true);
      try {
        const emp = await loadEmployees(selectedOrg.id);
        const job = await loadJobOrders(selectedOrg.id);

        if ("error" in emp) {
          setError(emp.error);
        } else if ("error" in job) {
          setError(job.error);
        } else {
          setEmployees(emp);
          setJobOrders(job);
          setError(null);
        }
      } catch (err) {
        setError("An unexpected error occurred");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchEmpJob();
  }, [selectedOrg]);

  const getValidDateString = (
    date: Date | string | null | undefined,
  ): string => {
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

  async function autoSchedule(distance?: number) {
    if (
      !departure ||
      selectedEmployees.length === 0 ||
      selectedJobOrders.length === 0
    ) {
      setError("Please select departure location, employees, and job orders");
      return;
    }

    setIsAutoScheduling(true);
    try {
      const depot: Location = {
        lat: departure.location.latitude,
        lng: departure.location.longitude,
        placeId: departure.location.placeId,
      };

      const distanceToUse = distance ?? maxDistance;

      const schedule = await optimizeRoutes(
        selectedJobOrders,
        selectedEmployees,
        depot,
        distanceToUse,
      );

      // Create new columns state with all job orders in jobOrders column first
      const newColumns: Columns = {
        jobOrders: {
          id: "jobOrders",
          title: "Job Orders",
          jobOrders: [...selectedJobOrders],
        },
      };
      selectedEmployees.forEach((employee) => {
        newColumns[employee.id] = {
          id: employee.id,
          title: employee.name,
          jobOrders: [],
        };
      });

      // Only distribute job orders if optimization was successful
      if (
        schedule.assignments &&
        schedule.assignments.length > 0 &&
        !schedule.error
      ) {
        // Clear the jobOrders column as we'll redistribute
        newColumns.jobOrders.jobOrders = [];

        // Add employee columns and assign job orders based on optimization results
        schedule.assignments.forEach((assignment) => {
          if (assignment.employeeId === "jobOrders") {
            newColumns.jobOrders.jobOrders =
              assignment.jobOrders as JobOrderWithTasks[];
          } else {
            const employee = selectedEmployees.find(
              (emp) => emp.id === assignment.employeeId,
            );
            if (employee) {
              newColumns[employee.id] = {
                id: employee.id,
                title: employee.name,
                jobOrders: assignment.jobOrders as JobOrderWithTasks[],
              };
            }
          }
        });
      } else {
        toast({
          variant: "destructive",
          title: "Auto-scheduling failed",
          description:
            schedule.error ||
            "Route optimization failed. All job orders remain unassigned.",
        });
      }

      setColumns(newColumns);
    } catch (error) {
      console.error("Error in auto-scheduling:", error);
      toast({
        variant: "destructive",
        title: "Auto-scheduling failed",
        description:
          "An error occurred during route optimization. All job orders remain unassigned.",
      });

      // Set all job orders to jobOrders column and create empty columns for employees
      const newColumns: Columns = {
        jobOrders: {
          id: "jobOrders",
          title: "Job Orders",
          jobOrders: [...selectedJobOrders],
        },
      };

      // Add empty columns for all selected employees
      selectedEmployees.forEach((employee) => {
        newColumns[employee.id] = {
          id: employee.id,
          title: employee.name,
          jobOrders: [],
        };
      });

      setColumns(newColumns);
    } finally {
      setIsAutoScheduling(false);
    }
  }

  async function handleSave(name: string) {
    if (!departure || !selectedOrg) {
      setError("Missing required information");
      return;
    }

    // Check if any employees have job orders assigned
    const hasAssignments = Object.entries(columns).some(
      ([columnId, column]) => {
        return columnId !== "jobOrders" && column.jobOrders.length > 0;
      },
    );

    if (!hasAssignments) {
      toast({
        title: "Cannot Save Schedule",
        description:
          "You must assign at least one job order to an employee before saving.",
        variant: "destructive",
      });
      return;
    }

    const scheduleData: ScheduleValues = {
      name,
      departAddress: departure.location.address,
      departCity: departure.location.city,
      departPostCode: departure.location.postCode,
      departState: departure.location.state,
      departCountry: departure.location.country,
      departLatitude: departure.location.latitude,
      departLongitude: departure.location.longitude,
      departPlaceId: departure.location.placeId,
      orgId: selectedOrg.id,
      departTime: departure.datetime,
    };

    setError(null);
    startTransition(async () => {
      try {
        const result = await createSchedule(scheduleData, columns);
        if (result && result.error) {
          toast({
            title: "Error",
            description: `Error creating schedule`,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Success",
            description: `Successfully created schedule`,
          });
          router.push("/schedule");
        }
      } catch (err) {
        console.error("Error creating schedule:", err);
        setError("An unexpected error occurred. Please try again.");
      }
    });
  }

  

  useEffect(() => {

    const updateColumns = (
      newSelectedEmployees: Employees[],
      newSelectedJobOrders: JobOrderWithTasks[],
    ) => {
      const newColumns: Columns = {
        jobOrders: {
          id: "jobOrders",
          title: "Job Orders",
          jobOrders: [],
        },
      };
  
      // Create columns for all selected employees
      newSelectedEmployees.forEach((employee) => {
        newColumns[employee.id] = {
          id: employee.id,
          title: employee.name,
          jobOrders: [],
        };
      });
  
      // Distribute job orders to their respective columns
      newSelectedJobOrders.forEach((jobOrder) => {
        let placed = false;
        for (const columnId in newColumns) {
          if (
            columnId !== "jobOrders" &&
            columns[columnId]?.jobOrders.some((jo) => jo.id === jobOrder.id)
          ) {
            newColumns[columnId].jobOrders.push(jobOrder);
            placed = true;
            break;
          }
        }
        if (!placed) {
          newColumns.jobOrders.jobOrders.push(jobOrder);
        }
      });
  
      setColumns(newColumns);
    };

    updateColumns(selectedEmployees, selectedJobOrders);
  }, [selectedEmployees, selectedJobOrders]);

  const handleConfirm = () => {
    const distance = Number(tempDistance);
    if (distance > 0) {
      setMaxDistance(distance);
      setIsDistanceDialogOpen(false);
      autoSchedule(distance);
    } else {
      setError("Please enter a valid number greater than 0");
    }
  };

  if (isLoading) return <div className="p-4">Loading...</div>;

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <ErrorAlert error={error} onClose={() => setError(null)} />
      <div className="flex-shrink-0 space-y-4 p-4 pb-0">
        <div className="flex gap-4">
          <SelectionDialog
            title="Employees"
            items={employees}
            selectedItems={selectedEmployees}
            getItemId={(employee) => employee.id}
            getItemLabel={(employee) => `${employee.name}`}
            onSelectionChange={(newSelectedEmployees) => {
              setSelectedEmployees(newSelectedEmployees);
            }}
          />
          <SelectionDialog
            title="Job Orders"
            items={jobOrders}
            selectedItems={selectedJobOrders}
            getItemId={(jobOrder) => jobOrder.id}
            getItemLabel={(jobOrder) => jobOrder.orderNumber}
            getItemDate={(jobOrder) => getValidDateString(jobOrder.createdAt)}
            getItemStatus={(jobOrder) => jobOrder.status}
            onSelectionChange={(newSelectedJobOrders) => {
              setSelectedJobOrders(newSelectedJobOrders);
            }}
          />
          <DepartureDialog
            departure={departure}
            onDepartureChange={setDeparture}
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setTempDistance(maxDistance.toString());
              setIsDistanceDialogOpen(true);
            }}
          >
            AutoSched
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsSaveDialogOpen(true)}
            disabled={
              !departure ||
              !selectedOrg ||
              !Object.entries(columns).some(
                ([columnId, column]) =>
                  columnId !== "jobOrders" && column.jobOrders.length > 0,
              )
            }
          >
            Save
          </Button>
          {departure && selectedOrg && (
            <SaveScheduleDialog
              isOpen={isSaveDialogOpen}
              onClose={() => setIsSaveDialogOpen(false)}
              onSave={handleSave}
            />
          )}
        </div>

        {departure && (
          <div className="space-y-2 rounded-lg bg-muted/50 p-4">
            <div>
              <span className="font-medium">Departure:</span>{" "}
              <span className="text-muted-foreground">
                {format(departure.datetime, "PPP")} at{" "}
                {format(departure.datetime, "p")}
              </span>
            </div>
            <div>
              <span className="font-medium">Location:</span>{" "}
              <span className="text-muted-foreground">
                {departure.location.address}
              </span>
            </div>
            <div className="text-sm text-muted-foreground">
              {departure.location.city}, {departure.location.state}{" "}
              {departure.location.postCode}, {departure.location.country}
            </div>
          </div>
        )}
      </div>

      <div className="flex-grow overflow-hidden">
        {selectedEmployees.length === 0 || selectedJobOrders.length === 0 ? (
          <div className="flex h-full items-center justify-center p-8 text-center text-muted-foreground">
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
      <LoadingDialog isOpen={isAutoScheduling} message="Loading..." />
      <DistanceDialog
        isOpen={isDistanceDialogOpen}
        onOpenChange={setIsDistanceDialogOpen}
        tempDistance={tempDistance}
        onTempDistanceChange={setTempDistance}
        onConfirm={handleConfirm}
      />
    </div>
  );
}
