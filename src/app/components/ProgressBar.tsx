"use client";

import { AppProgressBar as ProgressBar } from "next-nprogress-bar";
import { PropsWithChildren, useEffect } from "react";
import { useRouter } from "next/navigation";

export function ProgressBarProvider({ children }: PropsWithChildren) {
  const router = useRouter();

  useEffect(() => {
    const handleStart = () => {
      console.log("Route change started");
    };

    const handleComplete = () => {
      console.log("Route change completed");
    };

    window.addEventListener("beforeunload", handleStart);
    window.addEventListener("load", handleComplete);

    return () => {
      window.removeEventListener("beforeunload", handleStart);
      window.removeEventListener("load", handleComplete);
    };
  }, []);

  return (
    <>
      {children}
      <ProgressBar
        height="4px"
        color="hsl(217.2 91.2% 59.8%)"
        options={{
          showSpinner: false,
          easing: "ease",
          speed: 400,
          minimum: 0.3,
        }}
        shallowRouting
        delay={100}
      />
    </>
  );
}
