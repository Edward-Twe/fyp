"use client";

import * as React from "react";
import {
  ChevronDown,
  Settings,
  Calendar,
  CheckSquare,
  Users,
  Package,
  BarChart3,
  Home,
  PlusCircle,
} from "lucide-react";

import UserButton from "@/components/UserButton";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import Logo from "@/assets/logo.png";
import LogoWordBlack from "@/assets/logo-word-black.png";
import LogoWordWhite from "@/assets/logo-word-white.png";
import Image from "next/image";
import Link from "next/link";
import { useTheme } from "next-themes";
import { loadOrganizations } from "./loadOrganizations";
import { Organization } from "@prisma/client";
import defaultLogo from "@/assets/organization.png";
import { OrganizationProvider, useOrganization } from "../contexts/OrganizationContext";
import { redirect } from "next/navigation";

function useMediaQuery(query: string) {
  const [matches, setMatches] = React.useState(false);

  React.useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    const listener = () => setMatches(media.matches);
    media.addListener(listener);
    return () => media.removeListener(listener);
  }, [matches, query]);

  return matches;
}

function ThemedImage({
  lightImageSrc,
  darkImageSrc,
}: {
  lightImageSrc: string;
  darkImageSrc: string;
}) {
  const { theme } = useTheme();

  const imageSrc = theme === "dark" ? darkImageSrc : lightImageSrc;

  return (
    <Image
      src={imageSrc}
      alt="Logo"
      width={127}
      height={24}
      className="w-3/5"
    />
  );
}

function LeftSidebarContent({
  className,
  children,
}: React.HTMLAttributes<HTMLDivElement> & { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = React.useState(false);
  const { selectedOrg, setSelectedOrg } = useOrganization();
  const isSmallScreen = useMediaQuery("(max-width: 768px)");
  const [organizations, setOrganizations] = React.useState<Organization[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setCollapsed(isSmallScreen);
  }, [isSmallScreen]);

  React.useEffect(() => {
    const fetchOrganizations = async () => {
      const result = await loadOrganizations();
      if ("error" in result) {
        setError(result.error);
      } else {
        setOrganizations(result);
      }
    };

    fetchOrganizations();
  }, []);

  return (
    <div className="relative flex h-screen bg-card">
      <div
        className={cn(
          "flex flex-col gap-4 border-r bg-background p-4 transition-all",
          collapsed ? "w-16" : "w-64",
          className,
        )}
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Image src={Logo.src} alt="Logo" width={40} height={40} />
            {!collapsed && (
              <ThemedImage
                lightImageSrc={LogoWordBlack.src}
                darkImageSrc={LogoWordWhite.src}
              />
            )}
          </div>
          <hr />
          {!collapsed && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between border border-black"
                >
                  {selectedOrg == null ? (
                    <span>Select Organization</span>
                  ) : (
                    <>
                      <Image
                        src={
                          !selectedOrg.orgPic ? defaultLogo : selectedOrg.orgPic
                        }
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
                          src={
                            organization.orgPic
                              ? organization.orgPic
                              : defaultLogo
                          }
                          alt={organization.name}
                          className="mr-2 h-8 w-8 rounded-full object-cover"
                        />
                        <span>{organization.name}</span>
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuItem className="cursor-pointer" onClick={() => redirect('/organizations')}>
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
          <NavItem collapsed={collapsed} icon={Home} label="Home" href="/" disabled={false}/>
          <NavItem
            collapsed={collapsed}
            icon={Calendar}
            label="Schedule"
            href="/schedule"
            disabled={selectedOrg == null}
          />
          <NavItem
            collapsed={collapsed}
            icon={Package}
            label="Tasks"
            href="/tasks" 
            disabled={selectedOrg == null}
          />
          <NavItem
            collapsed={collapsed}
            icon={Users}
            label="Employees"
            href="/employees" 
            disabled={selectedOrg == null}
          />
          <NavItem
            collapsed={collapsed}
            icon={CheckSquare}
            label="Job Orders"
            href="/job-orders" 
            disabled={selectedOrg == null}
          />
          <NavItem
            collapsed={collapsed}
            icon={BarChart3}
            label="Reports"
            href="/reports" 
            disabled={selectedOrg == null}
          />
        </nav>

        <div className="mt-auto">
          <NavItem
            collapsed={collapsed}
            icon={Settings}
            label="Settings"
            href="/settings"
            disabled={false}
          />
        </div>
      </div>

      {/* Header */}
      <div className="flex h-full flex-1 flex-col">
        <header className="flex h-14 items-center border-b bg-card px-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="mr-4"
          >
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform",
                collapsed ? "-rotate-90" : "rotate-90",
              )}
            />
          </Button>
          <h1 className="font-semibold">Dashboard</h1>
          <div className="ml-auto mr-2">
            <UserButton />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-400">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function LeftSidebar({
  className,
  children,
}: React.HTMLAttributes<HTMLDivElement> & { children: React.ReactNode }) {
  return (
    <OrganizationProvider>
      <LeftSidebarContent className={className}>
        {children}
      </LeftSidebarContent>
    </OrganizationProvider>
  );
}

interface NavItemProps {
  collapsed: boolean;
  icon: React.ElementType;
  label: string;
  href: string;
  disabled: boolean;
}

function NavItem({ collapsed, icon: Icon, label, href, disabled }: NavItemProps) {
  const handleClick = (e: React.MouseEvent) => {
    if (disabled) {
      e.preventDefault(); // Prevent the navigation if the button is disabled
    }
  };

  return (
    <Button
      variant="ghost"
      className={cn(
        "flex items-center gap-2",
        collapsed ? "justify-center px-2" : "justify-start",
        disabled ? "opacity-50 cursor-not-allowed" : ""
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
  );
}

