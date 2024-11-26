import { Metadata } from "next";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

import JobOrderForm from "./JobOrderForm";

export const metadata: Metadata = {
    title: "Create Job Order",
  };

export default function JobOrderPage() {

  return (
    <div className="container mx-auto py-10">
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Create New Job Order</CardTitle>
          <CardDescription>Fill in the details to create new Job Order.</CardDescription>
        </CardHeader>
        <JobOrderForm />
      </Card>
    </div>
  )
}