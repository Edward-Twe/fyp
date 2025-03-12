'use client'
import { logout } from "@/app/(auth)/logout/actions"
import { Button } from "@/components/ui/button"
import { LogOut, Building2, Trash2 } from "lucide-react"
import Link from "next/link"
import { useOrganization } from "@/app/contexts/OrganizationContext"
import { deleteOrganization } from "../organizations/delete/action"
import { useSession } from "../SessionProvider"
import { useEffect, useState } from "react";
import { validateRole } from "@/roleAuth"
import { Roles } from "@prisma/client"

export default function SettingsPage() {
  const { selectedOrg, clearSelectedOrg } = useOrganization();
  const user = useSession()
  const [userRole, setUserRole] = useState<Roles | null>(null); // State for user role

  useEffect(() => {
    const fetchUserRole = async () => {
      if (selectedOrg) {
        const role = await validateRole(user.user, selectedOrg.id); 
        setUserRole(role); // Set user role after validation
      } else {
        setUserRole(null); // Reset user role if no organization is selected
      }
    };

    fetchUserRole(); 
  }, [selectedOrg, user.user]);

  async function deleteOrg() {
    await deleteOrganization(selectedOrg!.id);
    clearSelectedOrg();
    window.location.href = '/';
  }

  return (
    <div className="container max-w-2xl py-6 lg:py-10">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage your account and organization settings</p>
        </div>
        <div className="divide-y rounded-lg border">
          {selectedOrg ? (
            <>
              {userRole === "owner" || userRole === "admin" ? (
                <>
                  <Link href={`/organizations/edit/${selectedOrg?.id}`} className="flex items-center justify-between p-4 hover:bg-muted/50">
                    <div className="flex items-center space-x-4">
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <h2 className="font-semibold">Edit Organization</h2>
                        <p className="text-sm text-muted-foreground">Update your organization details and preferences</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon">
                      →
                    </Button>
                  </Link>
                  <div className="flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer" onClick={deleteOrg}>
                    <div className="flex items-center space-x-4">
                      <Trash2 className="h-5 w-5 text-destructive" />
                      <div>
                        <h2 className="font-semibold text-destructive">Delete Organization</h2>
                        <p className="text-sm text-muted-foreground">Permanently delete your organization and all its data</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon">
                      →
                    </Button>
                  </div>
                </>
              ) : null}
            </>
          ) : null}
          <div className="flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer" onClick={logout}>
            <div className="flex items-center space-x-4">
              <LogOut className="h-5 w-5 text-muted-foreground" />
              <div>
                <h2 className="font-semibold">Log Out</h2>
                <p className="text-sm text-muted-foreground">Sign out of your account</p>
              </div>
            </div>
            <Button variant="ghost" size="icon">
              →
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
