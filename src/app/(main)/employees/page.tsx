"use client"

import { useEffect, useState } from "react"
import { Plus, Search, User, MoreHorizontal, ChevronRight, MapPin, Mail } from "lucide-react"
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
import Link from "next/link"
import type { Employees } from "@prisma/client"
import { loadEmployees } from "./loadEmployees"
import { useOrganization } from "@/app/contexts/OrganizationContext"
import { deleteEmployee } from "./delete/action"
import { toast } from "@/components/hooks/use-toast"
import { Input } from "@/components/ui/input"
import { CreateMessage } from "../updates/action"
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
import { validateRole } from "@/roleAuth"
import { Roles } from "@prisma/client"
import { useSession } from "../SessionProvider"

export default function EmployeesPage() {
  const { user } = useSession()
  const { selectedOrg } = useOrganization()
  const [employees, setEmployees] = useState<Employees[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [userRole, setUserRole] = useState<Roles | null>(null)
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table')

  // Filter employees based on search query
  const filteredEmployees = employees.filter((employee) =>
    employee.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

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
  }, [selectedOrg])

  useEffect(() => {
    async function fetchUserRole() {
      if (!selectedOrg) return;

      const role = await validateRole(user, selectedOrg.id);
      setUserRole(role);
    }

    fetchUserRole();
  }, [selectedOrg, user]);

  const handleDeleteEmployee = async (employeeId: string, employeeName: string) => {
    const result = await deleteEmployee(employeeId)
    if (result.success) {
      const messageResult = await CreateMessage(`deleted Employee: ${employeeName}`, selectedOrg!)
      if (messageResult && messageResult.error) {
        toast({
          title: "Error",
          description: `Error creating update message`,
          variant: "destructive",
        })
      }
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

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-8">
        <div className="animate-pulse-opacity text-theme-blue-500 dark:text-theme-blue-400">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <User className="h-16 w-16 animate-float" />
              <div className="absolute -right-2 -top-2 h-4 w-4 animate-pulse rounded-full bg-theme-blue-500"></div>
            </div>
            <p className="text-lg font-medium">Loading Employees...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!selectedOrg) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center p-8 text-center">
        <div className="glass-card max-w-md p-8">
          <div className="mb-6 text-theme-blue-500 dark:text-theme-blue-400">
            <User className="mx-auto h-16 w-16" />
          </div>
          <h1 className="mb-4 text-2xl font-bold text-gradient">Organization Required</h1>
          <p className="mb-6 text-muted-foreground">Please select or create an organization to view and manage employees.</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center p-8 text-center">
        <div className="glass-card max-w-md p-8">
          <div className="mb-6 text-red-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="mb-4 text-2xl font-bold">Something went wrong</h1>
          <p className="mb-6 text-muted-foreground">{error}</p>
          <Button onClick={() => window.location.reload()} className="w-full">Retry</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-10">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-theme-blue-100 p-3 dark:bg-theme-blue-900/30">
            <User className="h-6 w-6 text-theme-blue-600 dark:text-theme-blue-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gradient">Employees</h1>
            <p className="text-sm text-muted-foreground">Manage your team members and their details</p>
          </div>
        </div>
        
        {(userRole === "owner" || userRole === "admin") && (
          <Button asChild className="btn-primary">
            <Link href="/employees/create">
              <Plus className="mr-2 h-4 w-4" />
              Add Employee
            </Link>
          </Button>
        )}
      </div>

      <div className="mb-8 rounded-xl bg-white/80 p-6 shadow-soft backdrop-blur-sm dark:bg-gray-800/60">
        <div className="flex flex-col gap-4 md:flex-row md:items-end">
          <div className="flex-1 space-y-2">
            <label htmlFor="search" className="text-sm font-medium text-muted-foreground">
              Search Employees
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Search by employee name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 input-field"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'table' ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode('table')}
              className="h-10 w-10"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </Button>
            <Button
              variant={viewMode === 'grid' ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode('grid')}
              className="h-10 w-10"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </Button>
          </div>
        </div>
      </div>

      {filteredEmployees.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-xl bg-white/80 p-8 text-center shadow-soft backdrop-blur-sm dark:bg-gray-800/60">
          <div className="mb-4 rounded-full bg-theme-blue-100/50 p-4 dark:bg-theme-blue-900/20">
            <User className="h-8 w-8 text-theme-blue-500 dark:text-theme-blue-400" />
          </div>
          <h3 className="mb-2 text-xl font-semibold">No employees found</h3>
          <p className="mb-6 max-w-md text-muted-foreground">
            {searchQuery ? 
              "Try adjusting your search to find what you're looking for." : 
              "Add your first employee to get started with team management."}
          </p>
          {(userRole === "owner" || userRole === "admin") && !searchQuery && (
            <Button asChild className="btn-primary">
              <Link href="/employees/create">
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Employee
              </Link>
            </Button>
          )}
        </div>
      ) : viewMode === 'table' ? (
        <div className="rounded-xl bg-white/80 shadow-soft backdrop-blur-sm dark:bg-gray-800/60 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-theme-blue-50/50 dark:bg-theme-blue-900/20">
                <TableHead className="font-medium">Name</TableHead>
                <TableHead className="font-medium">Area</TableHead>
                <TableHead className="font-medium">Space</TableHead>
                <TableHead className="font-medium">Email</TableHead>
                <TableHead className="text-right font-medium">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.map((employee, index) => (
                <TableRow 
                  key={employee.id}
                  className="animate-fade-in border-b border-theme-blue-100/30 dark:border-theme-blue-900/20"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-theme-blue-100/50 dark:bg-theme-blue-900/30">
                        <User className="h-4 w-4 text-theme-blue-600 dark:text-theme-blue-400" />
                      </div>
                      <span>{employee.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>{!employee.area ? "-" : employee.area}</TableCell>
                  <TableCell>{!employee.space ? "-" : employee.space.toString()}</TableCell>
                  <TableCell>{!employee.email ? "-" : employee.email}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-theme-blue-100/50 dark:hover:bg-theme-blue-900/30">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56 glass-effect">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem
                          onClick={() => navigator.clipboard.writeText(employee.id)}
                          className="flex cursor-pointer items-center gap-2"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                          </svg>
                          Copy employee ID
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {(userRole === "owner" || userRole === "admin") && (
                          <DropdownMenuItem asChild>
                            <Link href={`/employees/edit/${employee.id}`} className="flex cursor-pointer items-center gap-2">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Edit employee
                            </Link>
                          </DropdownMenuItem>
                        )}
                        {(userRole === "owner" || userRole === "admin") && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem 
                                onSelect={(e) => e.preventDefault()}
                                className="text-red-600 dark:text-red-400 flex items-center gap-2"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Delete employee
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="glass-effect">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="text-xl">
                                  Are you absolutely sure?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will permanently delete the employee and all related
                                  data.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="btn-secondary">Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteEmployee(employee.id, employee.name)}
                                  className="bg-red-600 hover:bg-red-700 text-white"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredEmployees.map((employee, index) => (
            <div 
              key={employee.id} 
              className="animate-fade-in glass-card card-hover-effect overflow-hidden flex flex-col"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="p-5 flex-grow">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-theme-blue-100 dark:bg-theme-blue-900/30">
                    <User className="h-5 w-5 text-theme-blue-600 dark:text-theme-blue-400" />
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-theme-blue-100/50 dark:hover:bg-theme-blue-900/30">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 glass-effect">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem
                        onClick={() => navigator.clipboard.writeText(employee.id)}
                        className="flex cursor-pointer items-center gap-2"
                      >
                        Copy employee ID
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {(userRole === "owner" || userRole === "admin") && (
                        <DropdownMenuItem asChild>
                          <Link href={`/employees/edit/${employee.id}`}>Edit employee</Link>
                        </DropdownMenuItem>
                      )}
                      {(userRole === "owner" || userRole === "admin") && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                              Delete employee
                            </DropdownMenuItem>
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
                              <AlertDialogAction
                                onClick={() => handleDeleteEmployee(employee.id, employee.name)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <h3 className="mb-2 text-xl font-semibold">{employee.name}</h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                  {employee.area && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span>{employee.area}</span>
                    </div>
                  )}
                  {employee.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      <span>{employee.email}</span>
                    </div>
                  )}
                </div>
              </div>
              {(userRole === "owner" || userRole === "admin") && (
                <div className="mt-auto border-t border-theme-blue-100/30 dark:border-theme-blue-900/20 bg-theme-blue-50/50 dark:bg-theme-blue-900/10">
                  <Link 
                    href={`/employees/edit/${employee.id}`}
                    className="flex items-center justify-between p-4 text-sm font-medium text-theme-blue-600 dark:text-theme-blue-400 hover:text-theme-blue-700 dark:hover:text-theme-blue-300 transition-colors"
                  >
                    <span>Manage Employee</span>
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

