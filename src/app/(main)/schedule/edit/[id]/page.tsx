"use client";

import KanbanBoard from "@/components/kanban-board";
import { SelectionDialog } from "@/components/SelectionDialog";
import {
  DepartureDialog,
  type DepartureInfo,
} from "@/components/DepartureDialog";
import { Employees } from "@prisma/client";
import { startTransition, useEffect, useState } from "react";
import { loadEmployees } from "@/app/(main)/employees/loadEmployees";
import { useOrganization } from "@/app/contexts/OrganizationContext";
import { loadJobOrders } from "@/app/(main)/job-orders/loadJobOrders";
import { parseISO, isValid, format } from "date-fns";
import { Button } from "@/components/ui/button";
import { optimizeRoutes } from "@/app/(main)/schedule/utils/AutoSced";
import { Location, JobOrderWithTasks, Columns } from "@/app/types/routing";
import { ErrorAlert } from "@/components/ui/alert-box";
import { UpdateScheduleValues } from "@/lib/validation";
import { useParams, useRouter } from "next/navigation";
import { useToast } from "@/components/hooks/use-toast";
import { editSchedule, findSchedule, getEmployees } from "./action";
import { SaveScheduleDialog } from "../../utils/save-schedule-dialog";

export default function SchedulesPage() {
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
  const [scheduleName, setScheduleName] = useState<string | undefined>(undefined);
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const { id } = params;

  //load all the employees and joborders
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

  async function autoSchedule() {
    if (
      !departure ||
      selectedEmployees.length === 0 ||
      selectedJobOrders.length === 0
    ) {
      setError("Please select departure location, employees, and job orders");
      return;
    }

    try {
      const depot: Location = {
        lat: departure.location.latitude,
        lng: departure.location.longitude,
      };

      const schedule = await optimizeRoutes(
        selectedJobOrders,
        selectedEmployees,
        depot,
      );

      // Create new columns state based on optimized assignments
      const newColumns: Columns = {
        jobOrders: {
          id: "jobOrders",
          title: "Job Orders",
          jobOrders: [],
        },
      };

      // Add employee columns and assign job orders based on optimization results
      schedule.assignments.forEach((assignment) => {
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
      });

      // Update columns state
      setColumns(newColumns);
    } catch (error) {
      console.error("Error in auto-scheduling:", error);
      setError("Failed to optimize routes");
    }
  }

  useEffect(() => {
    if (!id) {
      setError("No ID provided.");
      setIsLoading(false);
      return;
    }

    const getSchedule = async () => {
      try {
        const fetchedSchedule = await findSchedule(id as string);
        const scheduledEmployees = await getEmployees(id as string);

        if (!fetchedSchedule || !scheduledEmployees) {
          setError("Schedule doesn't exist.");
        } else {
          const scheduledJobOrders = fetchedSchedule.jobOrder;
          setDeparture({
            datetime: fetchedSchedule.departTime,
            location: {
              address: fetchedSchedule.departAddress,
              city: fetchedSchedule.departCity,
              postCode: fetchedSchedule.departPostCode,
              state: fetchedSchedule.departState,
              country: fetchedSchedule.departCountry,
              latitude: Number(fetchedSchedule.departLatitude),
              longitude: Number(fetchedSchedule.departLongitude),
            },
          });

          setSelectedEmployees(scheduledEmployees);
          setSelectedJobOrders(scheduledJobOrders);

          const newColumns: Columns = {
            jobOrders: {
              id: "jobOrders",
              title: "Job Orders",
              jobOrders: [],
            },
          };

          fetchedSchedule.jobOrder.forEach((jo) => {
            const employee = jo.scheduledEmp;

            if (employee) {
              if (!newColumns[employee.id]) {
                // Initialize the column for this employee
                newColumns[employee.id] = {
                  id: employee.id,
                  title: employee.name,
                  jobOrders: [],
                };
              }

              // Add the job order to the employee's column
              newColumns[employee.id].jobOrders.push(jo);
            }
          });
          // Sort the jobOrders in each column by their `scheduledOrder`
          Object.values(newColumns).forEach((column) => {
            column.jobOrders.sort(
              (a, b) => (a.scheduledOrder || 0) - (b.scheduledOrder || 0),
            );
          });

          setColumns(newColumns);
          setScheduleName(fetchedSchedule.name);
        }
      } catch (err) {
        console.error("Error during fetch:", err);
        setError("Failed to fetch job order");
      }
    };

    getSchedule();
  }, [selectedOrg, id]);

  async function handleSave(name: string) {
    if (!departure || !selectedOrg) {
      setError("Missing required information");
      return;
    }

    const scheduleData: UpdateScheduleValues = {
      id: id as string,
      name,
      departAddress: departure.location.address,
      departCity: departure.location.city,
      departPostCode: departure.location.postCode,
      departState: departure.location.state,
      departCountry: departure.location.country,
      departLatitude: departure.location.latitude,
      departLongitude: departure.location.longitude,
      departTime: departure.datetime,
    };

    setError(null);
    startTransition(async () => {
      try {
        const result = await editSchedule(scheduleData, columns);
        if (result && result.error) {
          toast({
            title: "Error",
            description: `Error updated schedule #${scheduleData.id}`,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Success",
            description: `Successfully updated schedule #${scheduleData.id}`,
          });
          router.push("/schedule");
        }
      } catch (err) {
        console.error("Error creating schedule:", err);
        setError("An unexpected error occurred. Please try again.");
      }
    });
  }

  if (isLoading) return <div className="p-4">Loading...</div>;

  if (!id) return <h1>No ID provided.</h1>;

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
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsSaveDialogOpen(true)}
            disabled={!departure || !selectedOrg}
          >
            Save
          </Button>
          {departure && selectedOrg && (
            <SaveScheduleDialog
              isOpen={isSaveDialogOpen}
              onClose={() => setIsSaveDialogOpen(false)}
              onSave={handleSave}
              scheduleName={scheduleName}
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
    </div>
  );
}
