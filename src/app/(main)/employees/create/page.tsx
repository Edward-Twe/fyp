import { Metadata } from "next";
import { Card } from "@/components/ui/card"

import EmpForm from "./EmpForm";

export const metadata: Metadata = {
    title: "Create Employee",
  };

export default function CreateEmployee() {

  return (
    <div className="container mx-auto py-10">
      <Card className="w-full max-w-2xl mx-auto">
        <EmpForm />
      </Card>
    </div>
  )
}