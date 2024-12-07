import { Metadata } from "next";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import TaskForm from "./TaskFrom";

export const metadata: Metadata = {
  title: "Edit Task",
};

export default function EditTask({
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
          <CardTitle>Edit Task</CardTitle>
          <CardDescription>Fill in the details to edit task.</CardDescription>
        </CardHeader>
        <TaskForm id={id} />
      </Card>
    </div>
  )
}

