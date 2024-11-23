import { Metadata } from "next";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

import OrgForm from "./OrgForm";

export const metadata: Metadata = {
    title: "Create Organization",
  };

export default function CreateOrganization() {

  return (
    <div className="container mx-auto py-10">
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Create New Organization</CardTitle>
          <CardDescription>Fill in the details to create your organization.</CardDescription>
        </CardHeader>
        <OrgForm />
      </Card>
    </div>
  )
}