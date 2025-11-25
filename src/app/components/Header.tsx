"use client";

import { useRouter } from "next-nprogress-bar";
import { usePathname } from "next/navigation";
import { Beaker } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();

  const pages = [
    { title: "Дневник", path: "/" },
    { title: "Добавки", path: "/supplements" },
    { title: "Интеграции", path: "/integrations" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card shadow-sm">
      <div className="container mx-auto max-w-7xl">
        <div className="flex h-16 items-center justify-between px-4">
          <div
            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => router.push("/")}
          >
            <Beaker className="h-8 w-8 text-primary" />
            <h1 className="text-xl font-bold tracking-wider">БИОФАКЕР</h1>
          </div>

          <nav className="flex gap-1">
            {pages.map((page) => (
              <Button
                key={page.path}
                onClick={() => router.push(page.path)}
                variant="ghost"
                className={cn(
                  pathname === page.path &&
                    "font-bold border-b-2 border-primary rounded-none"
                )}
              >
                {page.title}
              </Button>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}
