"use client";

import { Toaster } from "sonner";
import { Sidebar } from "@/components/app/Sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto crm-main">
          {children}
        </main>
      </div>
      <Toaster richColors position="top-right" />
    </div>
  );
}
