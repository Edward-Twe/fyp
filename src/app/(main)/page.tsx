import KanbanBoard from "@/components/kanban-board";
import Dashboard from "./HomeDashBoard";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Home",
};

export default function HomePage() {
  return (
    <main className="">
  <Dashboard />
</main>

  );
}
