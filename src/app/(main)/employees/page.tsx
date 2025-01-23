"use client"

import { useEffect, useState } from "react"
import { Plus, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal } from "lucide-react"
import Link from "next/link"
import type { Employees } from "@prisma/client"
import { loadEmployees } from "./loadEmployees"
import { useOrganization } from "@/app/contexts/OrganizationContext"
import { deleteEmployee } from "./delete/action"
import { toast } from "@/components/hooks/use-toast"
import { useTableSort } from "@/app/(main)/hooks/use-table-sort"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export default function EmployeesPage() {
  const { selectedOrg } = useOrganization()
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { data: employees, setData: setEmployees, handleSort, getSortDirection } = useTableSort<Employees>([])

  useEffect(() => {
    async function fetchEmployees() {
      if (!selectedOrg) {
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      try {
        const result = await loadEmployees(selectedOrg.id)
        if ("error" in result) {
          setError(result.error)
        } else {
          setEmployees(result)
          setError(null)
        }
      } catch (err) {
        setError("An unexpected error occurred")
        console.log(err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchEmployees()
  }, [selectedOrg, setEmployees])

  const handleDeleteEmployee = async (employeeId: string) => {
    const result = await deleteEmployee(employeeId)
    if (result.success) {
      toast({
        title: "Success",
        description: result.message,
      })
      const updatedEmployees = employees.filter((emp) => emp.id !== employeeId)
      setEmployees(updatedEmployees)
    } else {
      toast({
        title: "Error",
        description: result.message,
        variant: "destructive",
      })
    }
  }

  const getSortIcon = (key: keyof Employees) => {
    const direction = getSortDirection(key)
    if (!direction) {
      return <ArrowUpDown className="ml-2 h-4 w-4" />
    }
    return direction === "asc" ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />
  }

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (!selectedOrg) return <h1>Please Select or Create an Organization first!</h1>

  if (error) {
    return error
  }

  return (
    <div className="container mx-auto py-10">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Employees</h1>
        <Button asChild>
          <Link href="/employees/create">
            <Plus className="mr-2 h-4 w-4" />
            New
          </Link>
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px] cursor-pointer" onClick={() => handleSort("name")}>
              <div className="flex items-center">
                Name
                {getSortIcon("name")}
              </div>
            </TableHead>
            <TableHead className="cursor-pointer" onClick={() => handleSort("area")}>
              <div className="flex items-center">
                Area
                {getSortIcon("area")}
              </div>
            </TableHead>
            <TableHead className="cursor-pointer" onClick={() => handleSort("space")}>
              <div className="flex items-center">
                Space
                {getSortIcon("space")}
              </div>
            </TableHead>
            <TableHead className="cursor-pointer" onClick={() => handleSort("email")}>
              <div className="flex items-center">
                Email
                {getSortIcon("email")}
              </div>
            </TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {employees.map((employee) => (
            <TableRow key={employee.id}>
              <TableCell className="font-medium">{employee.name}</TableCell>
              <TableCell>{!employee.area ? "-" : employee.area}</TableCell>
              <TableCell>{!employee.space ? "-" : employee.space.toString()}</TableCell>
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
                    <DropdownMenuItem onClick={() => navigator.clipboard.writeText(employee.id)}>
                      Copy employee ID
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href={`/employees/edit/${employee.id}`}>Edit employee</Link>
                    </DropdownMenuItem>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>Delete employee</DropdownMenuItem>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the employee and all related
                            data.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteEmployee(employee.id)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

