import { Metadata } from "next";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import OrgForm from "./OrgForm";

export const metadata: Metadata = {
  title: "Edit Organization",
};

type Params = Promise<{ id: string }>;

interface PageProps {
  params: Params;
}

export default async function EditOrganization({ params }: PageProps) {
  const { id } = await params;

  if (!id) return <h1>No ID provided.</h1>;

  return (
    <div className="container mx-auto py-10">
      <Card className="mx-auto w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Edit Organization</CardTitle>
          <CardDescription>
            Fill in the details to edit your organization.
          </CardDescription>
        </CardHeader>
        <OrgForm id={id} />
      </Card>
    </div>
  );
}
