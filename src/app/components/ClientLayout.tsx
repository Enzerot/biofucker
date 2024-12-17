"use client";

import RootStyleRegistry from "../emotion";
import Providers from "../providers";
import { NotificationProvider } from "../contexts/NotificationContext";
import Header from "./Header";
import { ProgressBarProvider } from "./ProgressBar";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProgressBarProvider>
      <RootStyleRegistry>
        <Providers>
          <NotificationProvider>
            <Header />
            <main>{children}</main>
          </NotificationProvider>
        </Providers>
      </RootStyleRegistry>
    </ProgressBarProvider>
  );
}
