import { Metadata } from "next";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import JobOrderForm from "./JobOrderForm";

type Params = Promise<{ id: string }>;

interface PageProps {
  params: Params;
}

export const metadata: Metadata = {
  title: "Edit Job Order",
};

export default async function EditJobOrder({ params }: PageProps) {
  const { id } = await params;

  if (!id) return <h1>No ID provided.</h1>;

  return (
    <div className="container mx-auto py-10">
      <Card className="mx-auto w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Edit Job Order</CardTitle>
          <CardDescription>
            Fill in the details to edit job order. {id}
          </CardDescription>
        </CardHeader>
        <JobOrderForm id={id} />
      </Card>
    </div>
  );
}
