"use client";

import { NotificationProvider } from "../contexts/NotificationContext";
import Header from "./Header";
import { ProgressBarProvider } from "./ProgressBar";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TooltipProvider>
      <ProgressBarProvider>
        <NotificationProvider>
          <Header />
          <main>{children}</main>
          <Toaster />
        </NotificationProvider>
      </ProgressBarProvider>
    </TooltipProvider>
  );
}
