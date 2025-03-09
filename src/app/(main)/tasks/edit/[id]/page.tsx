import { Metadata } from "next";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import TaskForm from "./TaskFrom";

export const metadata: Metadata = {
  title: "Edit Task",
};

type Params = Promise<{ id: string }>;

interface PageProps {
  params: Params;
}

export default async function EditTask({ params }: PageProps) {
  const { id } = await params;

  if (!id) return <h1>No ID provided.</h1>;

  return (
    <div className="container mx-auto py-10">
      <Card className="mx-auto w-full max-w-2xl">
        <TaskForm id={id} />
      </Card>
    </div>
  );
}
