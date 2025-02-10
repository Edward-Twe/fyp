'use client'
import { logout } from "@/app/(auth)/logout/actions"
import { Button } from "@/components/ui/button"
import { LogOut, Building2, Trash2 } from "lucide-react"
import Link from "next/link"
import { useOrganization } from "@/app/contexts/OrganizationContext"


export default function SettingsPage() {
  const { selectedOrg } = useOrganization();

  return (
    <div className="container max-w-2xl py-6 lg:py-10">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage your account and organization settings</p>
        </div>
        <div className="divide-y rounded-lg border">
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
          <Link href="/settings/delete" className="flex items-center justify-between p-4 hover:bg-muted/50">
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
          </Link>
          <Link href="/api/auth/signout" className="flex items-center justify-between p-4 hover:bg-muted/50">
            <div className="flex items-center space-x-4">
              <LogOut className="h-5 w-5 text-muted-foreground" />
              <div>
                <h2 className="font-semibold">Log Out</h2>
                <p className="text-sm text-muted-foreground">Sign out of your account</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={logout}>
              →
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

