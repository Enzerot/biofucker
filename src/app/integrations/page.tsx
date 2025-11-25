"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNotification } from "../contexts/NotificationContext";
import {
  CheckCircle2,
  Circle,
  LogOut,
  Link2,
  Moon,
  Activity,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

type SleepSource = "fitbit" | "whoop" | "none";

interface IntegrationStatus {
  activeSource: SleepSource;
  fitbitConnected: boolean;
  whoopConnected: boolean;
}

const integrations = [
  {
    id: "fitbit" as const,
    name: "Fitbit",
    description: "Трекеры и умные часы Fitbit",
    icon: Activity,
    color: "bg-teal-500/10 text-teal-400 border-teal-500/30",
    activeColor: "bg-teal-500",
    authUrl: "/api/fitbit/auth",
    logoutUrl: "/api/fitbit/logout",
  },
  {
    id: "whoop" as const,
    name: "WHOOP",
    description: "Фитнес-браслеты WHOOP",
    icon: Moon,
    color: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    activeColor: "bg-amber-500",
    authUrl: "/api/whoop/auth",
    logoutUrl: "/api/whoop/logout",
  },
];

export default function IntegrationsPage() {
  const [status, setStatus] = useState<IntegrationStatus>({
    activeSource: "none",
    fitbitConnected: false,
    whoopConnected: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { showNotification } = useNotification();

  const loadStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/integrations");
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error("Error loading integration status:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const handleConnect = (authUrl: string) => {
    window.location.href = authUrl;
  };

  const handleDisconnect = async (integration: (typeof integrations)[0]) => {
    setActionLoading(`logout-${integration.id}`);
    try {
      const response = await fetch(integration.logoutUrl, { method: "POST" });
      if (response.ok) {
        if (status.activeSource === integration.id) {
          await fetch("/api/integrations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ source: "none" }),
          });
        }
        await loadStatus();
        showNotification(`${integration.name} отключён`);
      }
    } catch (error) {
      console.error("Error disconnecting:", error);
      showNotification("Ошибка при отключении", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleSetActive = async (source: SleepSource) => {
    if (source === status.activeSource) return;

    setActionLoading(`active-${source}`);
    try {
      const response = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source }),
      });
      if (response.ok) {
        await loadStatus();
        const name = integrations.find((i) => i.id === source)?.name || source;
        showNotification(
          source === "none"
            ? "Автоматическое заполнение сна отключено"
            : `${name} выбран как источник данных о сне`
        );
      }
    } catch (error) {
      console.error("Error setting active source:", error);
      showNotification("Ошибка при выборе источника", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const isConnected = (id: SleepSource): boolean => {
    if (id === "fitbit") return status.fitbitConnected;
    if (id === "whoop") return status.whoopConnected;
    return false;
  };

  if (isLoading) {
    return (
      <div className="py-8">
        <div className="container mx-auto max-w-3xl px-4">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8">
      <div className="container mx-auto max-w-3xl px-4">
        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Интеграции</h1>
            <p className="text-muted-foreground">
              Подключите сервисы для автоматического получения данных о сне
            </p>
          </div>

          <div className="grid gap-4">
            {integrations.map((integration) => {
              const connected = isConnected(integration.id);
              const isActive = status.activeSource === integration.id;
              const Icon = integration.icon;

              return (
                <Card
                  key={integration.id}
                  className={cn(
                    "transition-all duration-200",
                    isActive && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                  )}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "p-2.5 rounded-xl border",
                            integration.color
                          )}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <CardTitle className="text-lg flex items-center gap-2">
                            {integration.name}
                            {connected && (
                              <Badge
                                variant="outline"
                                className="text-xs bg-green-500/10 text-green-400 border-green-500/30"
                              >
                                Подключён
                              </Badge>
                            )}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {integration.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      {connected ? (
                        <>
                          <Button
                            variant={isActive ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleSetActive(integration.id)}
                            disabled={actionLoading !== null}
                            className="flex-1"
                          >
                            {actionLoading === `active-${integration.id}` ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : isActive ? (
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                            ) : (
                              <Circle className="h-4 w-4 mr-2" />
                            )}
                            {isActive ? "Активный источник" : "Выбрать"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDisconnect(integration)}
                            disabled={actionLoading !== null}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            {actionLoading === `logout-${integration.id}` ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <LogOut className="h-4 w-4" />
                            )}
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleConnect(integration.authUrl)}
                          className="flex-1"
                        >
                          <Link2 className="h-4 w-4 mr-2" />
                          Подключить
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card className="bg-muted/30">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <Moon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Ручной ввод</p>
                  <p className="text-xs text-muted-foreground">
                    Время сна будет заполняться вручную
                  </p>
                </div>
                <Button
                  variant={status.activeSource === "none" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleSetActive("none")}
                  disabled={actionLoading !== null}
                >
                  {actionLoading === "active-none" ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : status.activeSource === "none" ? (
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                  ) : (
                    <Circle className="h-4 w-4 mr-2" />
                  )}
                  {status.activeSource === "none" ? "Активно" : "Выбрать"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

