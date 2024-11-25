import { Metadata } from "next";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

import TaskForm from "./TaskForm";

export const metadata: Metadata = {
    title: "Create Task",
  };

export default function CreateTask() {

  return (
    <div className="container mx-auto py-10">
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Create New Task</CardTitle>
          <CardDescription>Fill in the details to create new task.</CardDescription>
        </CardHeader>
        <TaskForm />
      </Card>
    </div>
  )
}