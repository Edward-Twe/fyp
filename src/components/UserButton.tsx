"use client";

import { useSession } from "@/app/(main)/SessionProvider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import Link from "next/link";
import { Check, LogOutIcon, Monitor, Sun, UserIcon } from "lucide-react";
import { Button } from "./ui/button";
import { logout } from "@/app/(auth)/logout/actions";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { useOrganization } from "@/app/contexts/OrganizationContext";
import { useRouter } from "next/navigation";

interface UserButtonProps {
  className?: string;
}

const getInitials = (name: string): string => {
  // Split the name by spaces and filter out any empty strings
  const words = name.split(" ").filter(Boolean);

  if (words.length >= 2) {
    // If there are two or more words, take the first letter of the first two words
    return (words[0][0] + words[1][0]).toUpperCase();
  } else {
    // If there's only one word, return the first letter of that word
    return words[0][0].toUpperCase();
  }
};

export default function UserButton({ className }: UserButtonProps) {
  const { user } = useSession();

  const { theme, setTheme } = useTheme();
  const { clearSelectedOrg } = useOrganization();
  const router = useRouter();

  async function handleLogout() {
    clearSelectedOrg();
    await logout();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild className="sm:ms-auto">
        <Button
          variant="ghost"
          className={cn(
            "flex-none focus:outline-none active:outline-none",
            className,
          )}
        >
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src="/placeholder-avatar.jpg" alt="User's avatar" />
              <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col text-left">
              <span className="text-sm font-semibold">{user.displayName}</span>
              <span className="text-xs text-muted-foreground">
                {user.email}
              </span>
            </div>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem asChild>
          <Link href={`/users/${user.username}`}>
            <UserIcon className="mr-2 size-4" />
            Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Monitor className="mr-2 size-4" />
            Theme
          </DropdownMenuSubTrigger>
          <DropdownMenuPortal>
            <DropdownMenuSubContent>
              <DropdownMenuItem onClick={() => setTheme("light")}>
                <Sun className="mr-2 size-4" />
                Light
                {theme === "light" && <Check className="ms-2" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("dark")}>
                <Monitor className="mr-2 size-4" />
                Dark
                {theme === "dark" && <Check className="ms-2" />}
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuPortal>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            handleLogout();
          }}
        >
          <LogOutIcon className="mr-2 size-4" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
