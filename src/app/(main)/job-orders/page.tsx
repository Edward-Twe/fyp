"use client";

import { useEffect, useState } from "react";
import { JobOrders, JobOrderTask, Tasks } from "@prisma/client";
import { loadJobOrders } from "./loadJobOrders";
import { useOrganization } from "@/app/contexts/OrganizationContext";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";

type JobOrderWithTasks = JobOrders & {
    JobOrderTask: (JobOrderTask & {
      task: Tasks
    })[]
  }

export default function JobOrdersPage() {
  // fetch the selected organization
  const { selectedOrg } = useOrganization();
  const [jobOrders, setJobOrders] = useState<JobOrderWithTasks[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchJobOrders() {
      if (!selectedOrg) {
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      try {
        const result = await loadJobOrders(selectedOrg.id);
        if ("error" in result) {
          setError(result.error);
        } else {
          setJobOrders(result);
          setError(null);
        }
      } catch (err) {
        setError("An unexpected error occurred");
        console.error("Error during fetch:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchJobOrders();
  }, [selectedOrg]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!selectedOrg)
    return <h1>Please Select or Create an Organization first!</h1>;

  return (
    <div className="container mx-auto py-10">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Job Orders</h1>
        <Button asChild>
          <Link href="/job-orders/create">
            <Plus className="mr-2 h-4 w-4" />
            New
          </Link>
        </Button>
      </div>
      <div className="space-y-4">
      {jobOrders.map((jobOrder) => (
        <Accordion type="single" collapsible key={jobOrder.id}>
          <AccordionItem value={jobOrder.id}>
            <AccordionTrigger className="text-left">
              <div>
                <h2 className="text-lg font-semibold">Order #{jobOrder.orderNumber}</h2>
                <p className="text-sm text-gray-500">{jobOrder.address}</p>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="mt-2 space-y-2">
                <h3 className="font-medium">Tasks:</h3>
                <ul className="list-disc list-inside">
                  {jobOrder.JobOrderTask.map((jobOrderTask) => (
                    <li key={jobOrderTask.id}>
                      {jobOrderTask.task.task} - Quantity: {jobOrderTask.quantity}
                      <span className="text-sm text-gray-500 ml-2">
                        ({jobOrderTask.task.requiredTimeValue.toString()} {jobOrderTask.task.requiredTimeUnit})
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      ))}
    </div>
    </div>
  );
}
