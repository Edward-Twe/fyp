"use client"

import * as React from "react"
import { ChevronDown, Settings, Calendar, CheckSquare, Users, Package, Home, PlusCircle, X } from "lucide-react"

import UserButton from "@/components/UserButton"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import Logo from "@/assets/logo.png"
import LogoWordBlack from "@/assets/logo-word-black.png"
import LogoWordWhite from "@/assets/logo-word-white.png"
import Image from "next/image"
import Link from "next/link"
import { useTheme } from "next-themes"
import { loadOrganizations } from "./loadOrganizations"
import type { Organization } from "@prisma/client"
import defaultLogo from "@/assets/organization.png"
import { OrganizationProvider, useOrganization } from "../contexts/OrganizationContext"
import { redirect } from "next/navigation"
import { useSession } from "./SessionProvider"
import { validateRole } from "@/roleAuth"
import type { Roles } from "@prisma/client"

function useMediaQuery(query: string) {
  const [matches, setMatches] = React.useState(false)

  React.useEffect(() => {
    const media = window.matchMedia(query)
    if (media.matches !== matches) {
      setMatches(media.matches)
    }
    const listener = () => setMatches(media.matches)
    media.addListener(listener)
    return () => media.removeListener(listener)
  }, [matches, query])

  return matches
}

function ThemedImage({
  lightImageSrc,
  darkImageSrc,
}: {
  lightImageSrc: string
  darkImageSrc: string
}) {
  const { theme } = useTheme()

  const imageSrc = theme === "dark" ? darkImageSrc : lightImageSrc

  return <Image src={imageSrc || "/placeholder.svg"} alt="Logo" width={127} height={24} className="w-3/5" />
}

function LeftSidebarContent({
  className,
  children,
}: React.HTMLAttributes<HTMLDivElement> & { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = React.useState(true)
  const { selectedOrg, setSelectedOrg } = useOrganization()
  const isSmallScreen = useMediaQuery("(max-width: 768px)")
  const [organizations, setOrganizations] = React.useState<Organization[]>([])
  const [error, setError] = React.useState<string | null>(null)
  const [userRole, setUserRole] = React.useState<Roles | null>(null)
  const { user } = useSession()

  const fetchOrganizations = async () => {
    const result = await loadOrganizations()
    if ("error" in result) {
      setError(result.error)
    } else {
      setOrganizations(result)
    }
  }

  React.useEffect(() => {
    setCollapsed(isSmallScreen)
  }, [isSmallScreen])

  React.useEffect(() => {
    fetchOrganizations()
  }, [])

  React.useEffect(() => {
    const handleRouteChange = () => {
      fetchOrganizations()
    }

    window.addEventListener("popstate", handleRouteChange)
    return () => window.removeEventListener("popstate", handleRouteChange)
  }, [])

  React.useEffect(() => {
    async function fetchUserRole() {
      if (selectedOrg && user) {
        const role = await validateRole(user, selectedOrg.id)
        setUserRole(role)
      } else {
        setUserRole(null)
      }
    }
    fetchUserRole()
  }, [selectedOrg, user])

  const navItems = [
    {
      icon: Home,
      label: "Home",
      href: "/",
      disabled: false,
      requiresAdmin: false,
    },
    {
      icon: Calendar,
      label: "Schedule",
      href: "/schedule",
      disabled: selectedOrg == null,
      requiresAdmin: false,
    },
    {
      icon: Package,
      label: "Tasks",
      href: "/tasks",
      disabled: selectedOrg == null,
      requiresAdmin: true,
    },
    {
      icon: Users,
      label: "Employees",
      href: "/employees",
      disabled: selectedOrg == null,
      requiresAdmin: true,
    },
    {
      icon: CheckSquare,
      label: "Job Orders",
      href: "/job-orders",
      disabled: selectedOrg == null,
      requiresAdmin: true,
    },
  ]

  return (
    <div className="relative flex h-screen overflow-hidden bg-card !ml-0">
      <div
        className={cn(
          "flex h-screen flex-col gap-4 border-r bg-background p-4 transition-all duration-300 ease-in-out z-10",
          collapsed ? "w-0 opacity-0" : "w-64 opacity-100",
          isSmallScreen ? "absolute left-0 top-0" : "relative", // Add absolute positioning for mobile
          className,
        )}
        style={{
          transform: collapsed ? "translateX(-100%)" : "translateX(0)",
          width: collapsed ? "0" : "16rem",
          marginLeft: collapsed ? "0" : "0",
        }}
      >
        {isSmallScreen && !collapsed && (
          <Button variant="ghost" size="icon" onClick={() => setCollapsed(true)} className="absolute right-2 top-2">
            <X className="h-4 w-4" />
            <span className="sr-only">Close sidebar</span>
          </Button>
        )}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3 hover:cursor-pointer" onClick={() => redirect("/")}>
            <Image src={Logo.src || "/placeholder.svg"} alt="Logo" width={40} height={40} />
            {!collapsed && <ThemedImage lightImageSrc={LogoWordBlack.src} darkImageSrc={LogoWordWhite.src} />}
          </div>
          <hr />
          {!collapsed && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full justify-between border border-black">
                  {selectedOrg == null ? (
                    <span>Select Organization</span>
                  ) : (
                    <>
                      <Image
                        src={defaultLogo}
                        alt={selectedOrg.name}
                        className="mr-2 h-8 w-8 rounded-full object-cover"
                      />
                      <span className="truncate">{selectedOrg.name}</span>
                    </>
                  )}
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                {error ? (
                  <span>{error}</span>
                ) : (
                  <>
                    {organizations.map((organization) => (
                      <DropdownMenuItem
                        key={organization.id}
                        className="cursor-pointer"
                        onClick={() => setSelectedOrg(organization)}
                      >
                        <Image
                          src={defaultLogo}
                          alt={organization.name}
                          className="mr-2 h-8 w-8 rounded-full object-cover"
                        />
                        <span>{organization.name}</span>
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuItem className="cursor-pointer" onClick={() => redirect("/organizations/create")}>
                      <PlusCircle className="ml-2 mr-4 h-8 w-8 rounded-full object-cover" />
                      <span>Create New</span>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <nav className="flex flex-col gap-2">
          {navItems.map(
            (item) =>
              (!item.requiresAdmin || userRole === "admin" || userRole === "owner") && (
                <NavItem
                  key={item.label}
                  collapsed={collapsed}
                  icon={item.icon}
                  label={item.label}
                  href={item.href}
                  disabled={item.disabled}
                />
              ),
          )}
        </nav>

        <div className="mt-auto">
          <NavItem collapsed={collapsed} icon={Settings} label="Settings" href="/settings" disabled={false} />
        </div>
      </div>

      {isSmallScreen && !collapsed && (
        <div className="fixed inset-0 bg-black/50 z-0" onClick={() => setCollapsed(true)} aria-hidden="true" />
      )}
      {/* Main content area with fixed header */}
      <div
        className={cn(
          "flex h-screen flex-col overflow-hidden",
          isSmallScreen ? "w-full" : collapsed ? "flex-1" : "flex-1", // Full width on mobile
        )}
      >
        {/* Fixed Header */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b bg-card px-4">
          <div className="flex items-center">
            <Button variant="ghost" size="icon" onClick={() => setCollapsed(!collapsed)} className="mr-2">
              <ChevronDown className={cn("h-4 w-4 transition-transform", collapsed ? "-rotate-90" : "rotate-90")} />
            </Button>
          </div>
          <div>
            <UserButton />
          </div>
        </header>

        {/* Scrollable main content */}
        <main className="flex-1 overflow-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-400">
          {children}
        </main>
      </div>
    </div>
  )
}

export default function LeftSidebar({
  className,
  children,
}: React.HTMLAttributes<HTMLDivElement> & { children: React.ReactNode }) {
  return (
    <OrganizationProvider>
      <LeftSidebarContent className={className}>{children}</LeftSidebarContent>
    </OrganizationProvider>
  )
}

interface NavItemProps {
  collapsed: boolean
  icon: React.ElementType
  label: string
  href: string
  disabled: boolean
}

function NavItem({ collapsed, icon: Icon, label, href, disabled }: NavItemProps) {
  const handleClick = (e: React.MouseEvent) => {
    if (disabled) {
      e.preventDefault() // Prevent the navigation if the button is disabled
    }
  }

  return (
    <Button
      variant="ghost"
      className={cn(
        "flex items-center gap-2",
        collapsed ? "justify-center px-2" : "justify-start",
        disabled ? "opacity-50 cursor-not-allowed" : "",
      )}
      disabled={disabled}
      title={disabled ? "Please select or create an organization first" : ""}
      asChild
    >
      <Link href={href} onClick={handleClick}>
        <Icon className="h-4 w-4" />
        {!collapsed && <span>{label}</span>}
      </Link>
    </Button>
  )
}

