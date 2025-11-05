"use client";

import { useState } from "react";
import { DailyEntry, Supplement } from "../types";
import { deleteDailyEntry } from "../actions";
import { useNotification } from "../contexts/NotificationContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Edit, Trash2, Moon, Sun, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface DailyEntriesProps {
  entries: DailyEntry[];
  supplements: Supplement[];
  onSuccess: () => void;
  onEdit: (entry: DailyEntry) => void;
  isLoading: boolean;
  editingEntry?: DailyEntry;
}

export default function DailyEntries({
  entries,
  supplements,
  onSuccess,
  onEdit,
  isLoading,
  editingEntry,
}: DailyEntriesProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<DailyEntry | null>(null);
  const { showNotification } = useNotification();

  const handleDelete = async () => {
    if (!entryToDelete) return;

    try {
      await deleteDailyEntry(entryToDelete.id);
      showNotification("Запись удалена");
      onSuccess();
    } catch (error) {
      console.error("Error deleting entry:", error);
      showNotification("Ошибка при удалении записи", "error");
    }
    setDeleteDialogOpen(false);
    setEntryToDelete(null);
  };

  const openDeleteDialog = (entry: DailyEntry) => {
    setEntryToDelete(entry);
    setDeleteDialogOpen(true);
  };

  if (entries.length === 0 && !isLoading) {
    return <p className="text-center text-muted-foreground">Нет записей</p>;
  }

  const sortedEntries = [...entries].sort((a, b) => b.date - a.date);

  return (
    <div className="relative">
      {isLoading && (
        <div className="absolute inset-0 flex items-start justify-center pt-32 bg-background/70 z-10 min-h-[600px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      <div className={`space-y-4 ${isLoading ? "opacity-90" : ""}`}>
        {sortedEntries.map((entry) => (
          <Card key={entry.id} className={cn(
            "transition-all duration-200",
            editingEntry?.id === entry.id && "ring-2 ring-primary shadow-lg"
          )}>
            <CardContent className="pt-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">
                  {format(new Date(entry.date), "d MMMM yyyy", { locale: ru })}
                </h3>
                <div className="flex items-center gap-2">
                  {entry.supplements.some(
                    (s) =>
                      s.supplement.name.startsWith("Время засыпания") ||
                      s.supplement.name.startsWith("Время пробуждения")
                  ) && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Moon className="h-4 w-4 text-blue-400" />
                      {entry.supplements
                        .find((s) =>
                          s.supplement.name.startsWith("Время засыпания")
                        )
                        ?.supplement.name.split(" ")
                        .pop()}
                      <span className="mx-1">→</span>
                      <Sun className="h-4 w-4 text-orange-400" />
                      {entry.supplements
                        .find((s) =>
                          s.supplement.name.startsWith("Время пробуждения")
                        )
                        ?.supplement.name.split(" ")
                        .pop()}
                    </div>
                  )}
                  <Badge variant="outline">{entry.rating} / 10</Badge>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => onEdit(entry)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => openDeleteDialog(entry)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>

              {entry.notes && (
                <p className="text-sm text-muted-foreground mb-4">
                  {entry.notes}
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                {entry.supplements
                  .filter(
                    (s) =>
                      !s.supplement.name.startsWith("Время засыпания") &&
                      !s.supplement.name.startsWith("Время пробуждения")
                  )
                  .sort((a, b) =>
                    a.supplement.name.localeCompare(b.supplement.name)
                  )
                  .map((supplement) => (
                    <Badge
                      key={`${entry.id}-${supplement.supplement.id}`}
                      variant="secondary"
                    >
                      {supplement.supplement.name}
                    </Badge>
                  ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Подтверждение удаления</DialogTitle>
            <DialogDescription>
              Вы уверены, что хотите удалить запись за{" "}
              {entryToDelete &&
                format(new Date(entryToDelete.date), "d MMMM yyyy", {
                  locale: ru,
                })}
              ?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Отмена
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Удалить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
