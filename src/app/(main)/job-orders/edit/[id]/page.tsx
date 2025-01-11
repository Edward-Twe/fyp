import { Metadata } from "next";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import JobOrderForm from "./JobOrderForm";

export const metadata: Metadata = {
  title: "Edit Job Order",
};

export default function EditJobOrder({
  params,
}: {
  params: { id: string };
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const { id } = params;

  if (!id) return (<h1>No ID provided.</h1>)

  return (
    <div className="container mx-auto py-10">
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Edit Job Order</CardTitle>
          <CardDescription>Fill in the details to edit job order.</CardDescription>
        </CardHeader>
        <JobOrderForm id={id} />
      </Card>
    </div>
  )
}