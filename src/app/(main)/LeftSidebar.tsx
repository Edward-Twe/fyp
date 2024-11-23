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
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

export default function LeftSidebar({
  className, 
  children, 
}: React.HTMLAttributes<HTMLDivElement> & {children: React.ReactNode}) {
  const [collapsed, setCollapsed] = React.useState(false);
  const [selectedProject, setSelectedProject] = React.useState("Project A");
  const isSmallScreen = useMediaQuery("(max-width: 768px)");

  React.useEffect(() => {
    setCollapsed(isSmallScreen);
  }, [isSmallScreen]);

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
                  {selectedProject}{" "}
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                <DropdownMenuItem
                  onSelect={() => setSelectedProject("Project A")}
                >
                  Project A
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => setSelectedProject("Project B")}
                >
                  Project B
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => setSelectedProject("Project C")}
                >
                  Project C
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <nav className="flex flex-col gap-2">
          <NavItem
            collapsed={collapsed}
            icon={Home}
            label="Home"
            href="/"
          />
          <NavItem
            collapsed={collapsed}
            icon={Calendar}
            label="Schedule"
            href="/schedule"
          />
          <NavItem
            collapsed={collapsed}
            icon={CheckSquare}
            label="Tasks"
            href="/tasks"
          />
          <NavItem
            collapsed={collapsed}
            icon={Users}
            label="Employees"
            href="/employees"
          />
          <NavItem
            collapsed={collapsed}
            icon={Package}
            label="Products"
            href="/products"
          />
          <NavItem
            collapsed={collapsed}
            icon={BarChart3}
            label="Reports"
            href="/reports"
          />
        </nav>

        <div className="mt-auto">
          <NavItem
            collapsed={collapsed}
            icon={Settings}
            label="Settings"
            href="/settings"
          />
        </div>
      </div>

          {/* Header */}
      <div className="flex-1 h-full flex flex-col">
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
        <main className="flex-1 p-4 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-400">
              {children}
        </main>
      </div>
    </div>
  );
}

interface NavItemProps {
  collapsed: boolean;
  icon: React.ElementType;
  label: string;
  href: string;
}

function NavItem({ collapsed, icon: Icon, label, href }: NavItemProps) {
  return (
    <Button
      variant="ghost"
      className={cn(
        "flex items-center gap-2",
        collapsed ? "justify-center px-2" : "justify-start",
      )}
      asChild
    >
      <Link href={href}>
        <Icon className="h-4 w-4" />
        {!collapsed && <span>{label}</span>}
      </Link>
    </Button>
  );
}
