"use client";

import KanbanBoard from "@/components/kanban-board";
import { Employees, JobOrders, JobOrderTask, Tasks } from "@prisma/client";
import { useEffect, useState } from "react";
import { loadEmployees } from "../../employees/loadEmployees";
import { useOrganization } from "@/app/contexts/OrganizationContext";
import { loadJobOrders } from "../../job-orders/loadJobOrders";

type JobOrderWithTasks = JobOrders & {
  JobOrderTask: (JobOrderTask & {
    task: Tasks;
  })[];
};

export default function Schedules() {
  const { selectedOrg } = useOrganization();
  const [employees, setEmployees] = useState<Employees[]>([]);
  const [jobOrders, setJobOrders] = useState<JobOrderWithTasks[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        console.log("hi");
        if ("error" in emp) {
          setError(emp.error);
        } else if ("error" in job) {
          setError(job.error);
        } else {
          setEmployees(emp);
          setJobOrders(job);
          setError(null);
          console.log(job);
          console.log(emp);
        }
      } catch (err) {
        setError("An unexpected error occurred");
        console.log(err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchEmpJob();
  }, [selectedOrg]);

  if (error) return <div>{error}</div>;

  if (isLoading) return <div>Loading...</div>;

  return <KanbanBoard employees={employees} jobOrders={jobOrders} />;
}
