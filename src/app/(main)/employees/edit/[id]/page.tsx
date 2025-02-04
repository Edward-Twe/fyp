import { Metadata } from "next";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import EmpForm from "./EmpForm";

export const metadata: Metadata = {
  title: "Edit Employee",
};

type Params = Promise<{ id: string }>;

interface PageProps {
  params: Params
}


export default async function EditEmployeePage({ params }: PageProps) {
  const { id } = await params;


  if (!id) return (<h1>No ID provided.</h1>)

  return (
    <div className="container mx-auto py-10">
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Edit Employee</CardTitle>
          <CardDescription>Fill in the details to edit employee.</CardDescription>
        </CardHeader>
        <EmpForm id={id} />
      </Card>
    </div>
  )
}

