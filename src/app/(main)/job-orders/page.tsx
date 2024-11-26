"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { Employees, JobOrders, JobOrderTask, Tasks } from "@prisma/client";
import { loadJobOrders } from "./loadJobOrders";
import { useOrganization } from "@/app/contexts/OrganizationContext";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

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
      {/* <div className="mb-4 flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Job Orders</h1>
        <Button asChild>
          <Link href="/job-orders/create">
            <Plus className="mr-2 h-4 w-4" />
            New
          </Link>
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Name</TableHead>
            <TableHead>Area</TableHead>
            <TableHead>Email</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {employees.map((employee) => (
            <TableRow key={employee.id}>
              <TableCell className="font-medium">{employee.name}</TableCell>
              <TableCell>{!employee.area ? "-" : employee.area}</TableCell>
              <TableCell>{!employee.email ? "-" : employee.email}</TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem
                      onClick={() => navigator.clipboard.writeText(employee.id)}
                    >
                      Copy employee ID
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href={`/employees/edit/${employee.id}`}>
                        Edit employee
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem>Delete employee</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table> */}
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
